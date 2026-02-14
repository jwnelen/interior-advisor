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
import { STYLE_IMAGES, QUIZ_PAIRS, PREFERENCES, STYLE_DESCRIPTIONS } from "@/lib/style-data";

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

    setCalculatedStyle({
      primaryStyle: sortedStyles[0][0],
      secondaryStyle: sortedStyles[1]?.[0],
      description: STYLE_DESCRIPTIONS[sortedStyles[0][0]],
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
              {QUIZ_PAIRS[currentQuizIndex].options.map((option) => {
                const styleInfo = STYLE_IMAGES.find((s) => s.id === option.id);
                return (
                  <Card
                    key={option.id}
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 overflow-hidden"
                    onClick={() => handleQuizSelection(option.id)}
                  >
                    <CardContent className="p-0">
                      <div className="h-64 relative">
                        {styleInfo?.imageUrl ? (
                          <img
                            src={styleInfo.imageUrl}
                            alt={option.label}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full ${styleInfo?.color || "bg-surface-inset"} flex items-center justify-center`}>
                            <span className="text-4xl">?</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 text-center">
                        <h3 className="font-semibold text-lg">{option.label}</h3>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
            <div className="space-y-12">
              {PREFERENCES.map((pref) => (
                <div key={pref.id} className="space-y-4">
                  <div className="text-center font-bold text-lg">{pref.label}</div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="aspect-video rounded-lg overflow-hidden border">
                        <img src={pref.leftImageUrl} alt={pref.leftLabel} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-center text-sm font-medium">{pref.leftLabel}</div>
                    </div>
                    
                    <div className="flex-[2] px-4">
                      <Slider
                        value={[preferences[pref.id as keyof typeof preferences]]}
                        onValueChange={([value]) =>
                          setPreferences({ ...preferences, [pref.id]: value })
                        }
                        max={100}
                        step={1}
                      />
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="aspect-video rounded-lg overflow-hidden border">
                        <img src={pref.rightImageUrl} alt={pref.rightLabel} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-center text-sm font-medium">{pref.rightLabel}</div>
                    </div>
                  </div>
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
                  className={`cursor-pointer transition-all overflow-hidden ${
                    moodSelections.includes(style.id)
                      ? "ring-2 ring-accent-brand-ring shadow-lg"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => handleMoodToggle(style.id)}
                >
                  <CardContent className="p-0">
                    <div className="h-32 relative">
                      <img 
                        src={style.imageUrl} 
                        alt={style.label} 
                        className="w-full h-full object-cover"
                      />
                      {moodSelections.includes(style.id) && (
                        <div className="absolute inset-0 bg-accent-brand/20 flex items-center justify-center">
                          <div className="w-8 h-8 bg-accent-brand rounded-full flex items-center justify-center shadow-lg">
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
