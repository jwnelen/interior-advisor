"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Interior Advisor</h1>
          <Link href="/dashboard">
            <Button variant="outline">My Projects</Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-slate-900 mb-6">
            Transform Your Space with AI-Powered Design
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Upload photos of your room, discover your style, and get personalized
            recommendations with realistic visualizations. Professional interior
            design guidance, without the designer fees.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/discover">
              <Button size="lg" className="text-lg px-8">
                Discover Your Style
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Start a Project
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Scene Analysis</h3>
              <p className="text-slate-600">
                Upload a photo and our AI instantly analyzes your furniture,
                lighting, colors, and layout to understand your space.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Recommendations</h3>
              <p className="text-slate-600">
                Get two tiers of suggestions: quick affordable wins under $200
                and larger transformations for maximum impact.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Visualize Changes</h3>
              <p className="text-slate-600">
                See AI-generated images of how recommendations would look in
                your actual space before making any purchases.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <div className="mt-24">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Discover Your Style",
                description: "Take a quick quiz to identify your design preferences",
              },
              {
                step: "2",
                title: "Create a Project",
                description: "Set your budget and constraints for your space",
              },
              {
                step: "3",
                title: "Upload Photos",
                description: "Add photos of rooms you want to improve",
              },
              {
                step: "4",
                title: "Get Recommendations",
                description: "Receive personalized suggestions and visualizations",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {item.step}
                </div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-slate-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center bg-slate-900 text-white rounded-2xl p-12">
          <h3 className="text-3xl font-bold mb-4">Ready to Transform Your Space?</h3>
          <p className="text-slate-300 mb-8 max-w-xl mx-auto">
            Start with a free style discovery quiz or jump right into creating
            your first project. No account required.
          </p>
          <Link href="/discover">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Get Started Free
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <div className="text-center text-slate-500 text-sm">
          <p>Interior Advisor - AI-Powered Home Design Assistant</p>
        </div>
      </footer>
    </div>
  );
}
