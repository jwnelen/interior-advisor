import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface AnalysisResults {
  style: { detected: string; confidence: number };
  colors: { dominant: string[]; palette: string };
  lighting: { natural: string; assessment: string };
  furniture: { item: string }[];
}

interface AnalysisCardProps {
  analysis: {
    status: "pending" | "processing" | "completed" | "failed";
    results?: AnalysisResults;
    error?: string;
  } | null | undefined;
  onGenerate: () => void;
  disabled: boolean;
  buttonLabel: string;
  hasPhotos: boolean;
}

export function AnalysisCard({ analysis, onGenerate, disabled, buttonLabel, hasPhotos }: AnalysisCardProps) {
  const badgeLabel = analysis === undefined ? "loading" : analysis === null ? "not started" : analysis.status;
  const badgeVariant = analysis?.status === "completed" ? "default" : analysis?.status === "failed" ? "destructive" : "secondary";

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Analysis</span>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {analysis === undefined ? (
          <p className="text-sm text-text-tertiary">Checking analysis status...</p>
        ) : analysis === null ? (
          <p className="text-sm text-text-tertiary">
            No analysis yet. Upload photos and generate when ready. All photos will be analyzed together.
          </p>
        ) : analysis.status === "processing" || analysis.status === "pending" ? (
          <div className="space-y-2">
            <p className="text-sm text-text-tertiary">
              {analysis.status === "pending" ? "Queued for analysis..." : "Analyzing your room..."}
            </p>
            <Progress value={50} />
          </div>
        ) : analysis.status === "completed" && analysis.results ? (
          <AnalysisResultsDisplay results={analysis.results} />
        ) : analysis.status === "failed" ? (
          <div className="space-y-3">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-destructive text-sm font-medium mb-1">Analysis failed</p>
              <p className="text-destructive/80 text-sm">{analysis.error || "Unknown error"}</p>
            </div>
            <Button className="w-full" onClick={onGenerate} variant="outline">
              Retry Analysis
            </Button>
          </div>
        ) : null}
        {analysis?.status !== "failed" && (
          <Button className="mt-4 w-full" onClick={onGenerate} disabled={disabled}>
            {buttonLabel}
          </Button>
        )}
        {!hasPhotos && (
          <p className="text-xs text-text-tertiary mt-2">Add at least one photo to enable analysis.</p>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisResultsDisplay({ results }: { results: AnalysisResults }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="font-medium mb-1">Detected Style</h4>
        <p className="capitalize">
          {results.style.detected} ({Math.round(results.style.confidence * 100)}% confidence)
        </p>
      </div>
      <div>
        <h4 className="font-medium mb-1">Color Palette</h4>
        <p className="capitalize">{results.colors.palette}</p>
        <div className="flex gap-1 mt-1">
          {results.colors.dominant.map((color, i) => (
            <span key={i} className="px-2 py-0.5 bg-surface-inset rounded text-xs">{color}</span>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-medium mb-1">Lighting</h4>
        <p className="capitalize">{results.lighting.natural} natural light</p>
        <p className="text-text-tertiary">{results.lighting.assessment}</p>
      </div>
      <div>
        <h4 className="font-medium mb-1">Furniture ({results.furniture.length} items)</h4>
        <div className="flex flex-wrap gap-1">
          {results.furniture.map((item, i) => (
            <span key={i} className="px-2 py-0.5 bg-surface-inset rounded text-xs">{item.item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
