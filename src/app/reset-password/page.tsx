"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Check if user has a valid session (came from reset link)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };
    checkSession();
  }, [supabase.auth]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-chart-2/10 animate-pulse" />
      </main>
    );
  }

  // No valid session - show error
  if (!isValidSession) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Invalid or expired link</h1>
            <p className="text-muted-foreground text-center">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>

          <Button
            onClick={() => router.push("/login")}
            size="pill-lg"
            className="w-full"
          >
            Back to sign in
          </Button>
        </div>
      </main>
    );
  }

  // Success state
  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-chart-2/10">
              <Check className="h-8 w-8 text-chart-2" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Password updated!</h1>
            <p className="text-muted-foreground text-center">
              Your password has been reset successfully. Redirecting you to your dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Icon */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-chart-2/10">
            <KeyRound className="h-8 w-8 text-chart-2" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Set new password</h1>
          <p className="text-muted-foreground text-center">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="pill-lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </div>
    </main>
  );
}

