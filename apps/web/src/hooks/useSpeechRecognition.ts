import { useCallback, useEffect, useRef, useState } from "react";
import { aiApi } from "@/services/api";

interface UseSpeechRecognitionOptions {
  onResult?: (text: string) => void;
}

function getNativeSpeechRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  const win = window as any;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function useSpeechRecognition(opts: UseSpeechRecognitionOptions = {}) {
  const { onResult } = opts;
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const isListeningRef = useRef(false);
  const usingNativeSpeechRef = useRef(false);
  const chunksRef = useRef<Blob[]>([]);
  const pendingRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nativeSpeechCtor = getNativeSpeechRecognitionCtor();

  const isSupported =
    !!nativeSpeechCtor ||
    (typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia);

  const sendAudio = useCallback(async () => {
    if (chunksRef.current.length === 0) return;

    // Combine all accumulated chunks into one complete blob
    const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];

    if (blob.size < 1000) return;

    pendingRef.current++;
    try {
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      const { text } = await aiApi.transcribe(base64, mime);
      if (text && onResultRef.current) {
        onResultRef.current(text);
      }
    } catch (err: any) {
      if (err?.response?.status === 429) {
        console.warn("[STT] Rate limited, skipping chunk");
      } else if (err?.response?.status === 503) {
        console.warn("[STT] Service unavailable, will retry next chunk");
      } else {
        console.error("[STT] Transcription failed:", err);
      }
    } finally {
      pendingRef.current--;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    chunksRef.current = [];

    if (nativeSpeechCtor) {
      try {
        const recognition = new nativeSpeechCtor();
        recognitionRef.current = recognition;
        usingNativeSpeechRef.current = true;

        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const segments: string[] = [];
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result?.isFinal) {
              const transcript = result[0]?.transcript?.trim();
              if (transcript) segments.push(transcript);
            }
          }

          if (segments.length > 0 && onResultRef.current) {
            onResultRef.current(segments.join(" "));
          }
        };

        recognition.onerror = (event: any) => {
          const code = event?.error;
          if (code === "not-allowed" || code === "service-not-allowed") {
            setError("Microphone access denied. Please allow microphone permission.");
          } else {
            setError("Speech recognition failed. Please try again.");
          }
          isListeningRef.current = false;
          setIsListening(false);
        };

        recognition.onend = () => {
          if (!isListeningRef.current) {
            setIsListening(false);
            return;
          }

          // Browser engines can stop continuous recognition unexpectedly.
          // If user is still listening, restart automatically.
          try {
            recognition.start();
          } catch {
            isListeningRef.current = false;
            setIsListening(false);
          }
        };

        isListeningRef.current = true;
        setIsListening(true);
        recognition.start();
        return;
      } catch (err) {
        console.warn(
          "[STT] Native speech recognition unavailable, falling back to server STT:",
          err,
        );
        recognitionRef.current = null;
        usingNativeSpeechRef.current = false;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Request data every 500ms so we accumulate chunks
      mediaRecorder.start(500);
      isListeningRef.current = true;
      setIsListening(true);

      // Every 3 seconds, stop recorder to flush a complete file,
      // send it, then restart
      intervalRef.current = setInterval(() => {
        if (!isListeningRef.current || !mediaRecorderRef.current) return;
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 3000);

      mediaRecorder.onstop = () => {
        // Send the accumulated chunks
        sendAudio();

        // Restart recording if still listening
        if (isListeningRef.current && streamRef.current?.active) {
          const newRecorder = new MediaRecorder(streamRef.current);
          mediaRecorderRef.current = newRecorder;
          chunksRef.current = [];

          newRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunksRef.current.push(e.data);
            }
          };

          newRecorder.onstop = mediaRecorder.onstop;

          newRecorder.start(500);
        }
      };
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Microphone access denied. Please allow microphone permission.");
      } else {
        setError("Could not access microphone.");
      }
    }
  }, [nativeSpeechCtor, sendAudio]);

  const stop = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);

    if (usingNativeSpeechRef.current) {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      usingNativeSpeechRef.current = false;

      if (recognition) {
        recognition.onend = null;
        try {
          recognition.stop();
        } catch {
          // Ignore stop errors from browser implementations.
        }
      }
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.onstop = () => {
        sendAudio(); // send final chunk
      };
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [sendAudio]);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;

      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onend = null;
        try {
          recognition.stop();
        } catch {
          // Ignore stop errors from browser implementations.
        }
      }

      if (intervalRef.current) clearInterval(intervalRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { isSupported, isListening, error, start, stop };
}
