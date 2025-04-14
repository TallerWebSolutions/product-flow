"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/app/actions/auth";

export interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await login(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        onSuccess?.();
      }

      setIsLoading(false);
    });
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              disabled={isLoading || isPending}
              autoComplete="email"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isLoading || isPending}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="text-sm text-red-500 mt-1">{error}</div>
          )}
          <Button type="submit" disabled={isLoading || isPending} className="w-full mt-2">
            {isLoading || isPending ? "Signing in..." : "Sign In"}
          </Button>
        </div>
      </form>
    </div>
  );
}