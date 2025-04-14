"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import Link from "next/link";

export function Header() {
  return (
    <header className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Link
            href="/"
            className="text-xl font-bold"
          >
            My App
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/profile"
            className="text-sm font-medium hover:underline"
          >
            Profile
          </Link>
          <LogoutButton variant="outline" />
        </div>
      </div>
    </header>
  );
}