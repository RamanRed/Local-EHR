import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useCallback } from "react";

interface TranscriptPanelProps {
  transcript: string;
  onChange: (value: string | ((prev: string) => string)) => void;
}

export function TranscriptPanel({
  transcript,
  onChange,
}: TranscriptPanelProps) {
  const handleResult = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      onChange((prev: string) => (prev ? prev + " " + trimmed : trimmed));
    },
    [onChange]
  );

  const { isSupported, isListening, error, start, stop } = useSpeechRecognition({
    onResult: handleResult,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Transcript</CardTitle>
          {isSupported ? (
            isListening ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={stop}
              >
                <span className="relative mr-1.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                <MicOff className="mr-1.5 h-3.5 w-3.5" />
                Stop
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={start}>
                <Mic className="mr-1.5 h-3.5 w-3.5" />
                Record
              </Button>
            )
          ) : (
            <Button variant="outline" size="sm" disabled>
              <Mic className="mr-1.5 h-3.5 w-3.5" />
              Record
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Type or paste the consultation transcript here..."
          value={transcript}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
        />
        {!isSupported && (
          <p className="mt-2 text-xs text-muted-foreground">
            Your browser doesn't support voice input. Use Chrome for speech-to-text.
          </p>
        )}
        {error && (
          <p className="mt-2 text-xs text-red-600">
            {error}
          </p>
        )}
        {isListening && (
          <p className="mt-2 text-xs text-teal-600 font-medium">
            Listening... Speak into your microphone.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
