import { Server as HTTPServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import {
  buildPatientContext,
  GeminiLiveSession,
  finalizeCall,
} from "../services/followup-call.service.js";
import { FOLLOWUP_SYSTEM_PROMPT_TEMPLATE } from "../utils/followup-prompts.js";
import type { JwtPayload } from "../middleware/auth.middleware.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function attachFollowUpCallWebSocket(server: HTTPServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const match = url.pathname.match(/^\/ws\/followup-call\/(.+)$/);

    if (!match) {
      // Not our path — let other upgrade handlers deal with it
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, match[1]);
    });
  });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage, callId: string) => {
    try {
      // ── 1. Authenticate via JWT in query param ──
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");

      if (!token) {
        ws.send(JSON.stringify({ type: "error", message: "Missing token" }));
        ws.close();
        return;
      }

      let user: JwtPayload;
      try {
        user = jwt.verify(token, JWT_SECRET) as JwtPayload;
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
        ws.close();
        return;
      }

      // Only DOCTOR and NURSE can initiate calls
      if (!["DOCTOR", "NURSE"].includes(user.role)) {
        ws.send(JSON.stringify({ type: "error", message: "Insufficient permissions" }));
        ws.close();
        return;
      }

      // ── 2. Validate call record ──
      const call = await prisma.followUpCall.findUnique({
        where: { id: callId },
      });

      if (!call) {
        ws.send(JSON.stringify({ type: "error", message: "Call not found" }));
        ws.close();
        return;
      }

      if (call.status !== "scheduled") {
        ws.send(JSON.stringify({ type: "error", message: `Call status is "${call.status}", expected "scheduled"` }));
        ws.close();
        return;
      }

      // ── 3. Update status to in_progress ──
      await prisma.followUpCall.update({
        where: { id: callId },
        data: { status: "in_progress", startedAt: new Date() },
      });

      // ── 4. Build patient context and connect to Gemini ──
      const { patientName, contextString } = await buildPatientContext(
        call.patientId,
        call.consultId
      );

      const systemPrompt = FOLLOWUP_SYSTEM_PROMPT_TEMPLATE
        .replace("{{patientName}}", patientName)
        .replace("{{patientContext}}", contextString);

      const geminiSession = new GeminiLiveSession(callId, {
        onAudioOutput: (base64Audio) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "audio", data: base64Audio }));
          }
        },
        onTranscriptUpdate: (role, text) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "transcript", role, text }));
          }
        },
        onSessionEnd: () => {
          // Gemini closed -finalize if flutter hasn't already
        },
        onError: (message) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "error", message }));
          }
        },
      });

      try {
        await geminiSession.connect(systemPrompt);
      } catch (err: any) {
        ws.send(JSON.stringify({ type: "error", message: `Failed to connect to Gemini: ${err.message}` }));
        await prisma.followUpCall.update({
          where: { id: callId },
          data: { status: "failed" },
        });
        ws.close();
        return;
      }

      // ── 5. Signal ready ──
      ws.send(JSON.stringify({ type: "ready" }));

      // ── 6. Handle messages from Flutter ──
      ws.on("message", (data: Buffer | string) => {
        try {
          const msg = JSON.parse(data.toString());

          switch (msg.type) {
            case "audio":
              geminiSession.sendAudio(msg.data, msg.mimeType || "audio/pcm");
              break;

            case "end_call":
              // Flutter requested call end
              geminiSession.close();
              finalizeCall(callId).then(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "call_ended" }));
                  ws.close();
                }
              });
              break;

            default:
              console.warn(`Unknown message type from Flutter: ${msg.type}`);
          }
        } catch (err) {
          console.error("Error processing Flutter message:", err);
        }
      });

      // ── 7. Handle Flutter disconnect ──
      ws.on("close", async () => {
        geminiSession.close();
        // Finalize if not already completed
        const current = await prisma.followUpCall.findUnique({
          where: { id: callId },
          select: { status: true },
        });
        if (current && current.status === "in_progress") {
          await finalizeCall(callId);
        }
      });
    } catch (error) {
      console.error("WebSocket connection error:", error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "error", message: "Internal server error" }));
        ws.close();
      }
    }
  });

  console.log("Follow-up call WebSocket relay attached");
}
