"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocalSession } from "@/lib/hooks/use-local-session";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navbar() {
  const sessionId = useLocalSession();
  const projects = useQuery(
    api.projects.list,
    sessionId ? { sessionId } : "skip"
  );

  const hasProjects = projects !== undefined && projects.length > 0;
  const logoHref = hasProjects ? "/dashboard" : "/";

  return (
    <header className="bg-surface-elevated border-b">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href={logoHref} className="text-2xl font-bold text-text-primary">
            Interior Advisor
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {hasProjects ? (
              <>
                <Link href="/style">
                  <Button variant="ghost">My Style</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline">My Projects</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/discover">
                  <Button variant="ghost">Discover Your Style</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline">My Projects</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
