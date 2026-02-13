"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocalSession } from "@/lib/hooks/use-local-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const STYLE_IMAGES = [
  { id: "modern", label: "Modern", color: "bg-surface-inset" },
  { id: "scandinavian", label: "Scandinavian", color: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "industrial", label: "Industrial", color: "bg-zinc-200 dark:bg-zinc-800" },
  { id: "traditional", label: "Traditional", color: "bg-rose-50 dark:bg-rose-950/30" },
  { id: "bohemian", label: "Bohemian", color: "bg-orange-100 dark:bg-orange-950/30" },
  { id: "minimalist", label: "Minimalist", color: "bg-surface-elevated" },
  { id: "coastal", label: "Coastal", color: "bg-sky-100 dark:bg-sky-950/30" },
  { id: "midcentury", label: "Mid-Century", color: "bg-amber-100 dark:bg-amber-950/30" },
];

const QUIZ_PAIRS = [
  {
    id: "q1",
    question: "Which space feels more like home?",
    options: [
      { id: "modern", label: "Clean & Contemporary" },
      { id: "traditional", label: "Classic & Timeless" },
    ],
  },
  {
    id: "q2",
    question: "What atmosphere do you prefer?",
    options: [
      { id: "minimalist", label: "Minimal & Calm" },
      { id: "bohemian", label: "Layered & Eclectic" },
    ],
  },
  {
    id: "q3",
    question: "Which materials speak to you?",
    options: [
      { id: "scandinavian", label: "Natural Wood & Linen" },
      { id: "industrial", label: "Metal & Concrete" },
    ],
  },
  {
    id: "q4",
    question: "What vibe resonates with you?",
    options: [
      { id: "coastal", label: "Relaxed & Breezy" },
      { id: "midcentury", label: "Retro & Organic" },
    ],
  },
];

const PREFERENCES = [
  { id: "comfort", label: "Comfort", leftLabel: "Practical", rightLabel: "Luxurious" },
  { id: "aesthetics", label: "Style", leftLabel: "Subdued", rightLabel: "Bold" },
  { id: "minimal", label: "Amount", leftLabel: "Minimal", rightLabel: "Layered" },
  { id: "cozy", label: "Feeling", leftLabel: "Airy", rightLabel: "Cozy" },
  { id: "modern", label: "Era", leftLabel: "Contemporary", rightLabel: "Classic" },
];

type Step = "intro" | "quiz" | "preferences" | "mood" | "results";

export default function DiscoverPage() {
  const router = useRouter();
  const sessionId = useLocalSession();
  const saveQuiz = useMutation(api.styleQuiz.save);

  const [step, setStep] = useState<Step>("intro");
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [responses, setResponses] = useState<{ questionId: string; selectedOption: string }[]>([]);
  const [preferences, setPreferences] = useState({
    comfort: 50,
    aesthetics: 50,
    minimal: 50,
    cozy: 50,
    modern: 50,
    traditional: 50,
  });
  const [moodSelections, setMoodSelections] = useState<string[]>([]);
  const [calculatedStyle, setCalculatedStyle] = useState<{
    primaryStyle: string;
    secondaryStyle?: string;
    description: string;
  } | null>(null);

  const totalSteps = QUIZ_PAIRS.length + 2; // quiz + preferences + mood
  const currentProgress =
    step === "intro"
      ? 0
      : step === "quiz"
      ? ((currentQuizIndex + 1) / totalSteps) * 100
      : step === "preferences"
      ? ((QUIZ_PAIRS.length + 1) / totalSteps) * 100
      : step === "mood"
      ? ((QUIZ_PAIRS.length + 2) / totalSteps) * 100
      : 100;

  const handleQuizSelection = (optionId: string) => {
    const newResponses = [
      ...responses,
      { questionId: QUIZ_PAIRS[currentQuizIndex].id, selectedOption: optionId },
    ];
    setResponses(newResponses);

    if (currentQuizIndex < QUIZ_PAIRS.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    } else {
      setStep("preferences");
    }
  };

  const handleMoodToggle = (styleId: string) => {
    setMoodSelections((prev) =>
      prev.includes(styleId)
        ? prev.filter((id) => id !== styleId)
        : prev.length < 3
        ? [...prev, styleId]
        : prev
    );
  };

  const handleComplete = async () => {
    if (!sessionId) return;

    await saveQuiz({
      sessionId,
      responses,
      moodBoardSelections: moodSelections,
      preferences,
    });

    // Calculate style locally for display
    const styleScores: Record<string, number> = {
      modern: preferences.modern + (100 - preferences.traditional) + preferences.minimal,
      scandinavian: preferences.minimal + preferences.modern + preferences.cozy,
      industrial: preferences.modern + (100 - preferences.cozy) + preferences.aesthetics,
      traditional: preferences.traditional + preferences.comfort + (100 - preferences.minimal),
      bohemian: preferences.cozy + preferences.aesthetics + (100 - preferences.minimal),
      minimalist: preferences.minimal * 2 + preferences.modern,
      coastal: preferences.cozy + preferences.comfort + (100 - preferences.modern) / 2,
      midcentury: preferences.modern + preferences.aesthetics + preferences.cozy / 2,
    };

    responses.forEach((response) => {
      if (styleScores[response.selectedOption] !== undefined) {
        styleScores[response.selectedOption] += 50;
      }
    });

    moodSelections.forEach((style) => {
      if (styleScores[style] !== undefined) {
        styleScores[style] += 30;
      }
    });

    const sortedStyles = Object.entries(styleScores).sort(([, a], [, b]) => b - a);

    const descriptions: Record<string, string> = {
      modern: "Clean lines, neutral colors, and functional design define your taste",
      scandinavian: "You prefer light, airy spaces with natural materials and cozy textiles",
      industrial: "Raw materials, exposed elements, and urban aesthetics appeal to you",
      traditional: "Classic elegance, rich colors, and timeless furniture suit your style",
      bohemian: "Eclectic patterns, global influences, and artistic expression inspire you",
      minimalist: "You believe less is more, with each item serving a purpose",
      coastal: "Relaxed, breezy vibes with natural textures make you feel at home",
      midcentury: "Retro charm with organic shapes and functional beauty defines your space",
    };

    setCalculatedStyle({
      primaryStyle: sortedStyles[0][0],
      secondaryStyle: sortedStyles[1]?.[0],
      description: descriptions[sortedStyles[0][0]],
    });

    setStep("results");
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-tertiary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent-brand-light to-surface-elevated">
      {/* Header */}
      <header className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-text-primary">
            Interior Advisor
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              Skip to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {step !== "intro" && step !== "results" && (
        <div className="container mx-auto px-4 mb-8">
          <Progress value={currentProgress} className="h-2" />
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {step === "intro" && (
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-6">Discover Your Style</h1>
            <p className="text-xl text-text-secondary mb-8">
              Take a quick quiz to help us understand your design preferences.
              We&apos;ll use this to personalize recommendations for your space.
            </p>
            <Button size="lg" onClick={() => setStep("quiz")}>
              Start Quiz
            </Button>
          </div>
        )}

        {step === "quiz" && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">
              {QUIZ_PAIRS[currentQuizIndex].question}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {QUIZ_PAIRS[currentQuizIndex].options.map((option) => (
                <Card
                  key={option.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                  onClick={() => handleQuizSelection(option.id)}
                >
                  <CardContent className="p-0">
                    <div
                      className={`h-48 ${
                        STYLE_IMAGES.find((s) => s.id === option.id)?.color ||
                        "bg-surface-inset"
                      } rounded-t-lg flex items-center justify-center`}
                    >
                      <span className="text-4xl">
                        {option.id === "modern" && "◻"}
                        {option.id === "traditional" && "🏛"}
                        {option.id === "minimalist" && "○"}
                        {option.id === "bohemian" && "🌿"}
                        {option.id === "scandinavian" && "🌲"}
                        {option.id === "industrial" && "⚙"}
                        {option.id === "coastal" && "🌊"}
                        {option.id === "midcentury" && "◐"}
                      </span>
                    </div>
                    <div className="p-4 text-center">
                      <h3 className="font-semibold text-lg">{option.label}</h3>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-center text-text-tertiary mt-6">
              Question {currentQuizIndex + 1} of {QUIZ_PAIRS.length}
            </p>
          </div>
        )}

        {step === "preferences" && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">
              Fine-tune Your Preferences
            </h2>
            <div className="space-y-8">
              {PREFERENCES.map((pref) => (
                <div key={pref.id} className="space-y-2">
                  <div className="flex justify-between text-sm text-text-secondary">
                    <span>{pref.leftLabel}</span>
                    <span className="font-medium">{pref.label}</span>
                    <span>{pref.rightLabel}</span>
                  </div>
                  <Slider
                    value={[preferences[pref.id as keyof typeof preferences]]}
                    onValueChange={([value]) =>
                      setPreferences({ ...preferences, [pref.id]: value })
                    }
                    max={100}
                    step={1}
                  />
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button size="lg" onClick={() => setStep("mood")}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === "mood" && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-4">
              Select Up to 3 Styles That Inspire You
            </h2>
            <p className="text-center text-text-secondary mb-8">
              {moodSelections.length}/3 selected
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STYLE_IMAGES.map((style) => (
                <Card
                  key={style.id}
                  className={`cursor-pointer transition-all ${
                    moodSelections.includes(style.id)
                      ? "ring-2 ring-accent-brand-ring shadow-lg"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => handleMoodToggle(style.id)}
                >
                  <CardContent className="p-0">
                    <div
                      className={`h-24 ${style.color} rounded-t-lg flex items-center justify-center`}
                    >
                      {moodSelections.includes(style.id) && (
                        <div className="w-8 h-8 bg-accent-brand rounded-full flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-center">
                      <span className="text-sm font-medium">{style.label}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button size="lg" onClick={handleComplete}>
                See My Style
              </Button>
            </div>
          </div>
        )}

        {step === "results" && calculatedStyle && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-feature-purple rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-12 h-12 text-feature-purple-text"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold mb-2">Your Style Profile</h1>
              <h2 className="text-4xl font-bold text-accent-brand mb-4 capitalize">
                {calculatedStyle.primaryStyle}
                {calculatedStyle.secondaryStyle &&
                  ` with ${calculatedStyle.secondaryStyle} touches`}
              </h2>
              <p className="text-xl text-text-secondary">{calculatedStyle.description}</p>
            </div>

            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Style Characteristics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-left">
                    <span className="text-text-tertiary">Primary Style:</span>
                    <p className="font-medium capitalize">
                      {calculatedStyle.primaryStyle}
                    </p>
                  </div>
                  {calculatedStyle.secondaryStyle && (
                    <div className="text-left">
                      <span className="text-text-tertiary">Secondary Style:</span>
                      <p className="font-medium capitalize">
                        {calculatedStyle.secondaryStyle}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg">Start a Project</Button>
              </Link>
              <Button size="lg" variant="outline" onClick={() => setStep("intro")}>
                Retake Quiz
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
