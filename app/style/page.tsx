"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import {
  STYLE_DESCRIPTIONS,
  STYLE_COLOR_PALETTES,
  COLOR_HEX_MAP,
} from "@/lib/style-data";

export default function StylePage() {
  const { data: session } = authClient.useSession();
  const quizData = useQuery(
    api.styleQuiz.get,
    session ? {} : "skip"
  );

  const style = quizData?.calculatedStyle;

  return (
    <div className="min-h-screen bg-surface-page">
      <Navbar />

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
          /* Style profile */
          <div className="max-w-3xl mx-auto space-y-10">
            {/* Title & style summary */}
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Your Style Profile</h1>
              <h2 className="text-2xl font-semibold text-accent-brand capitalize mb-2">
                {style.primaryStyle}
                {style.secondaryStyle && ` × ${style.secondaryStyle}`}
              </h2>
              <p className="text-text-secondary text-lg">
                {style.description || STYLE_DESCRIPTIONS[style.primaryStyle]}
              </p>
            </div>

            {/* Style DNA */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Your Style DNA</h3>
              <Card>
                <CardContent className="p-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <span className="text-text-tertiary text-sm uppercase tracking-wide">
                        Primary Style
                      </span>
                      <p className="font-semibold text-lg capitalize mt-1">
                        {style.primaryStyle}
                      </p>
                    </div>
                    {style.secondaryStyle && (
                      <div>
                        <span className="text-text-tertiary text-sm uppercase tracking-wide">
                          Secondary Style
                        </span>
                        <p className="font-semibold text-lg capitalize mt-1">
                          {style.secondaryStyle}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-text-tertiary text-sm uppercase tracking-wide">
                        Emotional Vibe
                      </span>
                      <p className="font-semibold text-lg capitalize mt-1">
                        {style.emotionalVibe}
                      </p>
                    </div>
                    {quizData.visualAnchor && (
                      <div>
                        <span className="text-text-tertiary text-sm uppercase tracking-wide">
                          Visual Anchor
                        </span>
                        <p className="font-semibold text-lg capitalize mt-1">
                          {quizData.visualAnchor}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-text-tertiary text-sm uppercase tracking-wide">
                        Decor Approach
                      </span>
                      <p className="font-semibold text-lg capitalize mt-1">
                        {style.decorDensity === "purist"
                          ? "The Purist"
                          : style.decorDensity === "curator"
                          ? "The Curator"
                          : "The Collector"}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-sm uppercase tracking-wide">
                        Color & Pattern
                      </span>
                      <p className="font-semibold text-lg capitalize mt-1">
                        {style.colorPattern.replace("-", " & ")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Color Palette */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Your Color Palette</h3>
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
                          <div className="flex flex-wrap gap-3">
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
                                <span className="text-xs text-text-secondary capitalize max-w-[80px] text-center">
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
