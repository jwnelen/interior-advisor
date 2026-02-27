"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/navbar";
import {
  EMOTIONAL_VIBE_QUESTION,
  VISUAL_ANCHOR_QUESTION,
  DECOR_DENSITY_QUESTION,
  COLOR_PATTERN_QUESTION,
  STYLE_DESCRIPTIONS,
} from "@/lib/style-data";

type Step = "intro" | "q1" | "q2" | "q3" | "q4" | "results";

interface QuizResponses {
  emotionalVibe?: string;
  visualAnchor?: string;
  decorDensity?: string;
  colorPattern?: string;
}

interface CalculatedStyle {
  primaryStyle: string;
  secondaryStyle?: string;
  description: string;
  emotionalVibe: string;
  decorDensity: string;
  colorPattern: string;
}

export default function DiscoverPage() {
  const saveQuiz = useMutation(api.styleQuiz.save);

  const [step, setStep] = useState<Step>("intro");
  const [responses, setResponses] = useState<QuizResponses>({});
  const [calculatedStyle, setCalculatedStyle] = useState<CalculatedStyle | null>(null);

  const totalSteps = 4;
  const stepOrder: Step[] = ["q1", "q2", "q3", "q4"];
  const currentStepIndex = stepOrder.indexOf(step);
  const currentProgress = step === "intro" ? 0 : step === "results" ? 100 : ((currentStepIndex + 1) / totalSteps) * 100;

  const handleSelection = (questionId: string, optionId: string) => {
    const newResponses = { ...responses, [questionId]: optionId };
    setResponses(newResponses);

    // Move to next question
    if (step === "q1") setStep("q2");
    else if (step === "q2") setStep("q3");
    else if (step === "q3") setStep("q4");
    else if (step === "q4") handleComplete(newResponses);
  };

  const handleComplete = async (finalResponses: QuizResponses) => {
    // Calculate style locally
    const calculated = calculateStyle(finalResponses);
    setCalculatedStyle(calculated);

    // Save to backend
    await saveQuiz({
      emotionalVibe: finalResponses.emotionalVibe,
      visualAnchor: finalResponses.visualAnchor,
      decorDensity: finalResponses.decorDensity,
      colorPattern: finalResponses.colorPattern,
    });

    setStep("results");
  };

  const renderQuestion = (
    questionData: typeof EMOTIONAL_VIBE_QUESTION,
    responseKey: keyof QuizResponses
  ) => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">{questionData.question}</h2>
        <p className="text-text-tertiary text-sm">
          Question {currentStepIndex + 1} of {totalSteps}
        </p>
      </div>
      <div className={`grid gap-4 ${questionData.options.length === 4 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {questionData.options.map((option) => (
          <Card
            key={option.id}
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] overflow-hidden group"
            onClick={() => handleSelection(responseKey, option.id)}
          >
            <CardContent className="p-0">
              <div className="aspect-[4/3] relative overflow-hidden">
                <img
                  src={option.imageUrl}
                  alt={option.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg mb-2">{option.label}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{option.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent-brand-light to-surface-elevated">
      <Navbar />

      {step !== "intro" && step !== "results" && (
        <div className="container mx-auto px-4 mb-8">
          <Progress value={currentProgress} className="h-2" />
        </div>
      )}

      <main className="container mx-auto px-4 py-4 md:py-8">
        {step === "intro" && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-accent-brand rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-white"
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
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover Your Style</h1>
              <p className="text-xl text-text-secondary mb-2">
                Answer 4 quick questions to help us understand your design preferences.
              </p>
              <p className="text-text-tertiary">
                We&apos;ll use this to personalize recommendations for your space.
              </p>
            </div>
            <Button size="lg" onClick={() => setStep("q1")} className="px-8">
              Start Discovery
            </Button>
          </div>
        )}

        {step === "q1" && renderQuestion(EMOTIONAL_VIBE_QUESTION, "emotionalVibe")}
        {step === "q2" && renderQuestion(VISUAL_ANCHOR_QUESTION, "visualAnchor")}
        {step === "q3" && renderQuestion(DECOR_DENSITY_QUESTION, "decorDensity")}
        {step === "q4" && renderQuestion(COLOR_PATTERN_QUESTION, "colorPattern")}

        {step === "results" && calculatedStyle && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
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
              <h1 className="text-3xl font-bold mb-3">Your Style Profile</h1>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-accent-brand mb-4 capitalize">
                {calculatedStyle.primaryStyle}
                {calculatedStyle.secondaryStyle && ` × ${calculatedStyle.secondaryStyle}`}
              </h2>
              <p className="text-base md:text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
                {calculatedStyle.description}
              </p>
            </div>

            <Card className="mb-8">
              <CardContent className="p-4 md:p-8">
                <h3 className="font-bold text-lg mb-6">Your Style DNA</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-text-tertiary text-sm uppercase tracking-wide">Primary Style</span>
                    <p className="font-semibold text-lg capitalize mt-1">{calculatedStyle.primaryStyle}</p>
                  </div>
                  {calculatedStyle.secondaryStyle && (
                    <div>
                      <span className="text-text-tertiary text-sm uppercase tracking-wide">Secondary Style</span>
                      <p className="font-semibold text-lg capitalize mt-1">{calculatedStyle.secondaryStyle}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-text-tertiary text-sm uppercase tracking-wide">Emotional Vibe</span>
                    <p className="font-semibold text-lg capitalize mt-1">
                      {responses.emotionalVibe?.replace(/-/g, " ")}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-tertiary text-sm uppercase tracking-wide">Decor Approach</span>
                    <p className="font-semibold text-lg capitalize mt-1">
                      {responses.decorDensity === "purist"
                        ? "The Purist"
                        : responses.decorDensity === "curator"
                        ? "The Curator"
                        : "The Collector"}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-tertiary text-sm uppercase tracking-wide">Color & Pattern</span>
                    <p className="font-semibold text-lg capitalize mt-1">
                      {responses.colorPattern?.replace(/-/g, " ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  Start a Project
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setStep("intro");
                  setResponses({});
                  setCalculatedStyle(null);
                }}
                className="w-full sm:w-auto"
              >
                Retake Quiz
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Calculate style based on the 4 key questions
 */
function calculateStyle(responses: QuizResponses): CalculatedStyle {
  const { emotionalVibe = "order", visualAnchor = "modern", decorDensity = "curator", colorPattern = "neutral" } = responses;

  // Primary style comes from Visual Anchor
  let primaryStyle = visualAnchor;

  // Refine based on other answers
  const styleModifiers: string[] = [];

  // Emotional Vibe influences
  if (emotionalVibe === "serenity") {
    if (visualAnchor === "modern") primaryStyle = "minimalist";
    else if (visualAnchor === "traditional") primaryStyle = "coastal";
    styleModifiers.push("scandinavian", "minimalist");
  } else if (emotionalVibe === "energy") {
    styleModifiers.push("eclectic", "maximalist");
  } else if (emotionalVibe === "cozy") {
    if (visualAnchor === "modern") primaryStyle = "scandinavian";
    styleModifiers.push("farmhouse", "bohemian");
  } else if (emotionalVibe === "order") {
    if (visualAnchor !== "modern") primaryStyle = "modern";
    styleModifiers.push("minimalist", "modern");
  }

  // Decor Density influences
  if (decorDensity === "purist") {
    if (visualAnchor !== "minimalist") primaryStyle = "minimalist";
    styleModifiers.push("minimalist", "scandinavian");
  } else if (decorDensity === "collector") {
    styleModifiers.push("bohemian", "eclectic", "maximalist");
  } else {
    styleModifiers.push("mid-century", "modern");
  }

  // Color & Pattern influences
  if (colorPattern === "neutral") {
    styleModifiers.push("minimalist", "scandinavian");
  } else if (colorPattern === "natural") {
    styleModifiers.push("scandinavian", "coastal", "farmhouse");
  } else if (colorPattern === "bold") {
    styleModifiers.push("eclectic", "maximalist", "bohemian");
  }

  // Count style modifier frequencies to determine secondary style
  const styleCounts: Record<string, number> = {};
  styleModifiers.forEach((style) => {
    styleCounts[style] = (styleCounts[style] || 0) + 1;
  });

  // Get secondary style (most common modifier that's different from primary)
  const sortedModifiers = Object.entries(styleCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([style]) => style);
  const secondaryStyle = sortedModifiers.find((style) => style !== primaryStyle);

  const description = STYLE_DESCRIPTIONS[primaryStyle] || "A unique blend of styles that reflects your personality.";

  return {
    primaryStyle,
    secondaryStyle,
    description,
    emotionalVibe,
    decorDensity,
    colorPattern,
  };
}
