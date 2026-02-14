"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocalSession } from "@/lib/hooks/use-local-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  STYLE_IMAGES,
  QUIZ_PAIRS,
  PREFERENCES,
  STYLE_DESCRIPTIONS,
  STYLE_COLOR_PALETTES,
  COLOR_HEX_MAP,
} from "@/lib/style-data";

export default function StylePage() {
  const sessionId = useLocalSession();
  const quizData = useQuery(
    api.styleQuiz.getBySession,
    sessionId ? { sessionId } : "skip"
  );

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-tertiary">Loading...</p>
      </div>
    );
  }

  const style = quizData?.calculatedStyle;

  return (
    <div className="min-h-screen bg-surface-page">
      {/* Header */}
      <header className="bg-surface-elevated border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-text-primary">
              Interior Advisor
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/dashboard">
                <Button variant="outline">My Projects</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {quizData === undefined ? (
          <div className="text-center py-12">
            <p className="text-text-tertiary">Loading style profile...</p>
          </div>
        ) : !quizData || !style ? (
          /* Empty state */
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 bg-feature-purple rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-feature-purple-text"
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
            <h1 className="text-3xl font-bold mb-3">No Style Profile Yet</h1>
            <p className="text-text-secondary mb-8">
              Take the style discovery quiz to find out your design personality
              and get personalized recommendations.
            </p>
            <Link href="/discover">
              <Button size="lg">Discover Your Style</Button>
            </Link>
          </div>
        ) : (
          /* Full style profile */
          <div className="max-w-3xl mx-auto space-y-10">
            {/* Title & style summary */}
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Your Style Profile</h1>
              <h2 className="text-2xl font-semibold text-accent-brand capitalize mb-2">
                {style.primaryStyle}
                {style.secondaryStyle &&
                  ` with ${style.secondaryStyle} touches`}
              </h2>
              <p className="text-text-secondary text-lg">
                {style.description}
              </p>
            </div>

            {/* Quiz answers */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Quiz Answers</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {QUIZ_PAIRS.map((pair) => {
                  const response = quizData.responses.find(
                    (r) => r.questionId === pair.id
                  );
                  const selectedOption = pair.options.find(
                    (o) => o.id === response?.selectedOption
                  );
                  const styleImage = STYLE_IMAGES.find(
                    (s) => s.id === response?.selectedOption
                  );

                  return (
                    <Card key={pair.id}>
                      <CardContent className="p-4">
                        <p className="text-sm text-text-tertiary mb-2">
                          {pair.question}
                        </p>
                        <div className="flex items-center gap-3">
                          {styleImage?.imageUrl && (
                            <img
                              src={styleImage.imageUrl}
                              alt={selectedOption?.label ?? ""}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <span className="font-medium">
                            {selectedOption?.label ?? "—"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Preferences */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Your Preferences</h3>
              <Card>
                <CardContent className="p-6 space-y-6">
                  {PREFERENCES.map((pref) => {
                    const value =
                      quizData.preferences[
                        pref.id as keyof typeof quizData.preferences
                      ] ?? 50;

                    return (
                      <div key={pref.id}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-text-secondary">
                            {pref.leftLabel}
                          </span>
                          <span className="font-medium">{pref.label}</span>
                          <span className="text-text-secondary">
                            {pref.rightLabel}
                          </span>
                        </div>
                        <div className="relative h-2 rounded-full bg-surface-inset">
                          <div
                            className="absolute top-0 left-0 h-full rounded-full bg-accent-brand"
                            style={{ width: `${value}%` }}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent-brand border-2 border-white shadow"
                            style={{ left: `calc(${value}% - 8px)` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>

            {/* Mood Board */}
            {quizData.moodBoardSelections.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold mb-4">Mood Board</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {quizData.moodBoardSelections.map((styleId) => {
                    const styleInfo = STYLE_IMAGES.find(
                      (s) => s.id === styleId
                    );
                    if (!styleInfo) return null;

                    return (
                      <Card key={styleId} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="h-32">
                            <img
                              src={styleInfo.imageUrl}
                              alt={styleInfo.label}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-3 text-center">
                            <span className="text-sm font-medium">
                              {styleInfo.label}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Color Palette */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Color Palette</h3>
              <div className="space-y-4">
                {[style.primaryStyle, style.secondaryStyle]
                  .filter(Boolean)
                  .map((styleName) => {
                    const colors = STYLE_COLOR_PALETTES[styleName!];
                    if (!colors) return null;

                    return (
                      <Card key={styleName}>
                        <CardContent className="p-4">
                          <p className="text-sm text-text-tertiary mb-3 capitalize">
                            {styleName} palette
                          </p>
                          <div className="flex gap-3">
                            {colors.map((color) => (
                              <div
                                key={color}
                                className="flex flex-col items-center gap-1.5"
                              >
                                <div
                                  className="w-12 h-12 rounded-lg border shadow-sm"
                                  style={{
                                    backgroundColor:
                                      COLOR_HEX_MAP[color] ?? "#ccc",
                                  }}
                                />
                                <span className="text-xs text-text-secondary capitalize">
                                  {color}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </section>

            {/* Actions */}
            <div className="flex gap-4 justify-center pt-4 pb-8">
              <Link href="/discover">
                <Button variant="outline" size="lg">
                  Retake Quiz
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg">Start a Project</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
