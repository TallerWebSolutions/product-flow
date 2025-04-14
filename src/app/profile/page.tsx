"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadUserProfile() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/auth");
          return;
        }

        setUser(user);
        setFullName(user.user_metadata?.full_name || "");
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [router, supabase.auth]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage({ text: "", type: "" });

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) {
        throw error;
      }

      setMessage({
        text: "Profile updated successfully",
        type: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
      setMessage({
        text: errorMessage,
        type: "error"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-md py-12">
        <div className="text-center">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md py-12">
      <h1 className="text-2xl font-bold mb-6">User Profile</h1>

      <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="mt-1"
            />
            <p className="text-muted-foreground text-sm mt-1">
              Email cannot be changed
            </p>
          </div>

          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1"
              disabled={isUpdating}
            />
          </div>

          {message.text && (
            <div className={`p-3 rounded ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {message.text}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isUpdating}
          >
            {isUpdating ? "Updating..." : "Update Profile"}
          </Button>
        </form>
      </div>
    </div>
  );
}