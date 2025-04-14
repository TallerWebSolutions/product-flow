"use client";

import { useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  const handleLoginSuccess = () => {
    // Redirect to home page after login
    router.push('/');
  };

  const handleRegisterSuccess = () => {
    // Redirect back to login form after registration
    setIsLogin(true);
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <div className="flex justify-center mb-8">
        <div className="flex space-x-2 rounded-lg bg-muted p-1">
          <Button
            variant={isLogin ? "default" : "outline"}
            onClick={() => setIsLogin(true)}
            className="text-sm font-medium"
          >
            Login
          </Button>
          <Button
            variant={!isLogin ? "default" : "outline"}
            onClick={() => setIsLogin(false)}
            className="text-sm font-medium"
          >
            Register
          </Button>
        </div>
      </div>

      <div className="transition-all">
        {isLogin ? (
          <LoginForm onSuccess={handleLoginSuccess} />
        ) : (
          <RegisterForm onSuccess={handleRegisterSuccess} />
        )}
      </div>
    </div>
  );
}