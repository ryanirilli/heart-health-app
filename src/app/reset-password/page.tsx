"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Check, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

// Password requirements
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

// Reset password form schema with confirmation matching
const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  // Check if user has a valid session (came from reset link)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };
    checkSession();
  }, [supabase.auth]);

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    setServerError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      // Clear the password reset required cookie
      await fetch('/api/auth/clear-reset-cookie', { method: 'POST' });

      setSuccess(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to reset password");
    }
  };

  const handleCancel = async () => {
    // Clear the cookie and sign out
    await fetch('/api/auth/clear-reset-cookie', { method: 'POST' });
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-chart-1/20 animate-pulse" />
      </main>
    );
  }

  // No valid session - show error
  if (!isValidSession) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/20">
              <AlertCircle className="h-7 w-7 text-destructive" />
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
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-chart-1/20">
              <Check className="h-7 w-7 text-chart-1" />
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
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-chart-1/20">
            <KeyRound className="h-7 w-7 text-chart-1" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Set new password</h1>
          <p className="text-muted-foreground text-center">
            Choose a strong password for your account
          </p>
        </div>

        <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              {...form.register("password")}
              aria-invalid={!!form.formState.errors.password}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
            {!form.formState.errors.password && (
              <p className="text-xs text-muted-foreground">
                Min 8 characters with uppercase, lowercase, and number
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
              aria-invalid={!!form.formState.errors.confirmPassword}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          {serverError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            size="pill-lg"
            disabled={form.formState.isSubmitting}
            className="w-full"
          >
            {form.formState.isSubmitting ? "Updating..." : "Update password"}
          </Button>
        </form>

        <Button
          type="button"
          variant="ghost"
          size="pill-lg"
          onClick={handleCancel}
          className="w-full text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel and sign out
        </Button>
      </div>
    </main>
  );
}
