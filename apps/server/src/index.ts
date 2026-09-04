import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.js";
import authRoutes from "./routes/auth.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import consultRoutes from "./routes/consult.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import fhirRoutes from "./routes/fhir.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import suggestRoutes from "./routes/suggest.routes.js";
import followupRoutes from "./routes/followup.routes.js";
import followUpCallRoutes from "./routes/followup-call.routes.js";
import { attachFollowUpCallWebSocket } from "./routes/followup-call.ws.js";
import { startFollowUpScheduler, stopFollowUpScheduler } from "./services/followup-scheduler.js";
import { authMiddleware, requireRole } from "./middleware/auth.middleware.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ["http://localhost:5173", "http://10.65.20.205:5173", "https://xx6xd6mc-5173.inc1.devtunnels.ms"],
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Swagger docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/patients", authMiddleware, patientRoutes);
app.use("/api/consults", authMiddleware, consultRoutes);
app.use("/api/ai", authMiddleware, requireRole("DOCTOR"), aiRoutes);
app.use("/api/ai", authMiddleware, requireRole("DOCTOR"), suggestRoutes);
app.use("/api/stats", authMiddleware, statsRoutes);
app.use("/api/upload", authMiddleware, uploadRoutes);
app.use("/api/fhir", fhirRoutes);
app.use("/api/appointments", authMiddleware, appointmentRoutes);
app.use("/api/follow-ups", authMiddleware, followupRoutes);
app.use("/api/followup-calls", authMiddleware, followUpCallRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  attachFollowUpCallWebSocket(server);
  startFollowUpScheduler();
});

// Graceful shutdown on Ctrl+C
process.on("SIGINT", () => {
  stopFollowUpScheduler();
  server.close(() => process.exit(0));
});
process.on("SIGTERM", () => {
  stopFollowUpScheduler();
  server.close(() => process.exit(0));
});
