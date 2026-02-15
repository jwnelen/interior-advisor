import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RecommendationItem } from "./recommendation-item";

interface CustomQuestion {
  _id: Id<"recommendations">;
  userQuestion?: string;
  status: "pending" | "generating" | "completed" | "failed";
  items: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    estimatedCost: { min: number; max: number; currency: string };
    impact: "high" | "medium" | "low";
    difficulty: "diy" | "easy_install" | "professional";
    reasoning: string;
    visualizationPrompt?: string;
    suggestedPhotoStorageId?: Id<"_storage">;
    selected?: boolean;
  }>;
  summary?: string;
}

interface CustomQuestionSectionProps {
  roomId: Id<"rooms">;
  customQuestions: CustomQuestion[];
  photos: { storageId: Id<"_storage">; url: string }[];
  onAskQuestion: (question: string) => void;
  onDeleteQuestion: (id: Id<"recommendations">) => void;
  onToggle: (args: { id: Id<"recommendations">; itemId: string; selected: boolean }) => void;
  onVisualize: (item: { visualizationPrompt?: string; suggestedPhotoStorageId?: Id<"_storage"> }) => void;
}

export function CustomQuestionSection({
  customQuestions,
  photos,
  onAskQuestion,
  onDeleteQuestion,
  onToggle,
  onVisualize,
}: CustomQuestionSectionProps) {
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    setIsAsking(true);
    try {
      await onAskQuestion(question.trim());
      setQuestion("");
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ask a Custom Question</CardTitle>
        <p className="text-sm text-text-secondary">
          Get personalized recommendations by asking specific questions about your space
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question Input */}
        <div className="flex gap-2">
          <Input
            placeholder='e.g., "How can I make it more cozy?" or "What color rug would you suggest?"'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isAsking}
            className="flex-1"
          />
          <Button onClick={handleAskQuestion} disabled={isAsking || !question.trim()}>
            {isAsking ? "Asking..." : "Ask"}
          </Button>
        </div>

        {/* Example Questions */}
        {customQuestions.length === 0 && (
          <div className="bg-surface-inset rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Example questions:</p>
            <ul className="text-sm text-text-secondary space-y-1">
              <li className="cursor-pointer hover:text-text-primary" onClick={() => setQuestion("How can I make this room more cozy?")}>
                • How can I make this room more cozy?
              </li>
              <li className="cursor-pointer hover:text-text-primary" onClick={() => setQuestion("What color rug would work best here?")}>
                • What color rug would work best here?
              </li>
              <li className="cursor-pointer hover:text-text-primary" onClick={() => setQuestion("How can I add more natural light?")}>
                • How can I add more natural light?
              </li>
              <li className="cursor-pointer hover:text-text-primary" onClick={() => setQuestion("What artwork style would complement this space?")}>
                • What artwork style would complement this space?
              </li>
            </ul>
          </div>
        )}

        {/* Previous Questions & Answers */}
        {customQuestions.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-text-tertiary uppercase tracking-wide">
              Your Questions ({customQuestions.length})
            </h3>
            {customQuestions.map((customQ) => (
              <div key={customQ._id} className="border rounded-lg p-4 space-y-3">
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-accent-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-sm">Your Question:</span>
                    </div>
                    <p className="text-text-primary italic pl-6">&ldquo;{customQ.userQuestion}&rdquo;</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteQuestion(customQ._id)}
                    className="text-text-tertiary hover:text-destructive"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>

                {/* Answer */}
                {customQ.status === "generating" ? (
                  <div className="pl-6 py-4">
                    <Progress value={50} className="mb-3" />
                    <p className="text-sm text-text-tertiary">Generating personalized answer...</p>
                  </div>
                ) : customQ.status === "completed" && customQ.items.length > 0 ? (
                  <div className="pl-6">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-feature-green" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-sm text-feature-green-text">Recommendation:</span>
                    </div>
                    {customQ.items.map((item) => (
                      <RecommendationItem
                        key={item.id}
                        item={item}
                        photos={photos}
                        recommendationId={customQ._id}
                        onToggle={onToggle}
                        onVisualize={() => onVisualize(item)}
                      />
                    ))}
                  </div>
                ) : customQ.status === "failed" ? (
                  <div className="pl-6 text-sm text-destructive">
                    Failed to generate answer. Please try asking again.
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
