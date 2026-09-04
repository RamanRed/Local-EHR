import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

interface SymptomsInputProps {
  symptoms: string[];
  onChange: (symptoms: string[]) => void;
}

export function SymptomsInput({ symptoms, onChange }: SymptomsInputProps) {
  const [input, setInput] = useState("");

  function addSymptom() {
    const trimmed = input.trim();
    if (trimmed && !symptoms.includes(trimmed)) {
      onChange([...symptoms, trimmed]);
      setInput("");
    }
  }

  function removeSymptom(symptom: string) {
    onChange(symptoms.filter((s) => s !== symptom));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSymptom();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Type a symptom and press Enter"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addSymptom}
          disabled={!input.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {symptoms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {symptoms.map((symptom) => (
            <span
              key={symptom}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-sm text-primary"
            >
              {symptom}
              <button
                type="button"
                onClick={() => removeSymptom(symptom)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-primary/10"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
