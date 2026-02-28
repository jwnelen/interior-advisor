"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navbar() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const projects = useQuery(api.projects.list, session ? {} : "skip");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hasProjects = projects !== undefined && projects.length > 0;
  const logoHref = hasProjects ? "/dashboard" : "/";

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="bg-surface-elevated border-b">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <nav className="flex items-center justify-between">
          <Link href={logoHref} className="text-xl md:text-2xl font-bold text-text-primary">
            Interior Advisor
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <>
                {hasProjects ? (
                  <Link href="/style">
                    <Button variant="ghost">My Style</Button>
                  </Link>
                ) : (
                  <Link href="/discover">
                    <Button variant="ghost">Discover Your Style</Button>
                  </Link>
                )}
                <Link href="/dashboard">
                  <Button variant="outline">My Projects</Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await authClient.signOut();
                    router.replace("/");
                  }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Link href="/sign-in">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>

          {/* Mobile nav controls */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            {session ? (
              <button
                className="p-2 rounded-md hover:bg-surface-inset transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            ) : (
              <Link href="/sign-in">
                <Button size="sm">Sign In</Button>
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && session && (
          <div className="md:hidden border-t mt-3 pt-3 pb-1 flex flex-col gap-1">
            {hasProjects ? (
              <Link href="/style" onClick={closeMobileMenu}>
                <Button variant="ghost" className="w-full justify-start">My Style</Button>
              </Link>
            ) : (
              <Link href="/discover" onClick={closeMobileMenu}>
                <Button variant="ghost" className="w-full justify-start">Discover Your Style</Button>
              </Link>
            )}
            <Link href="/dashboard" onClick={closeMobileMenu}>
              <Button variant="ghost" className="w-full justify-start">My Projects</Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={async () => {
                closeMobileMenu();
                await authClient.signOut();
                router.replace("/");
              }}
            >
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
