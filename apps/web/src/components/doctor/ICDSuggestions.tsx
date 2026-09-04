import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { IcdCode } from "@vox/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ICDSuggestionsProps {
  suggestions: IcdCode[];
  selected: IcdCode[];
  onToggle: (code: IcdCode) => void;
  onAdd?: (code: IcdCode) => void;
}

export function ICDSuggestions({
  suggestions,
  selected,
  onToggle,
  onAdd,
}: ICDSuggestionsProps) {
  const [showForm, setShowForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const selectedCodes = new Set(selected.map((s) => s.code));

  function handleAdd() {
    const code = newCode.trim().toUpperCase();
    const description = newDesc.trim();
    if (!code || !description) return;

    const entry: IcdCode = { code, description };
    onAdd?.(entry);
    // also auto-select it
    if (!selectedCodes.has(code)) {
      onToggle(entry);
    }
    setNewCode("");
    setNewDesc("");
    setShowForm(false);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">ICD-10 Codes</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? (
              <>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Code
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Manual add form */}
        {showForm && (
          <div className="rounded-lg border border-dashed p-3 space-y-2">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <Input
                placeholder="e.g. J06.9"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newCode.trim() || !newDesc.trim()}
              className="w-full"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add ICD-10 Code
            </Button>
          </div>
        )}

        {/* Code list */}
        {suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.map((icd) => (
              <label
                key={icd.code}
                className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selectedCodes.has(icd.code)}
                  onChange={() => onToggle(icd)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium">{icd.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {icd.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          !showForm && (
            <p className="py-2 text-center text-sm text-muted-foreground">
              No codes yet. Use AI suggestions or add manually.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
