"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function LogoutButton({
  variant = "default",
  size = "default",
  className = ""
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);

    startTransition(async () => {
      const result = await logout();

      if (result.success) {
        router.push("/auth");
        router.refresh(); // Refresh to update auth state
      }

      setIsLoading(false);
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isLoading || isPending}
    >
      {isLoading || isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}