"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Activity, Mail, ArrowLeft, RotateCw, KeyRound, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

// Password requirements
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

// Schema for sign in (less strict - just check it's not empty)
const signInSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

// Schema for sign up (strict password requirements + terms agreement)
const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: passwordSchema,
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms of Service and Privacy Policy",
  }),
});

// Schema for forgot password
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

function LoginContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup";
  const [isSignUp, setIsSignUp] = useState(initialMode);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [showResendOption, setShowResendOption] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showResetResendOption, setShowResetResendOption] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Auth form with dynamic schema based on isSignUp
  const authForm = useForm<SignInFormData | SignUpFormData>({
    resolver: zodResolver(isSignUp ? signUpSchema : signInSchema),
    defaultValues: isSignUp 
      ? { email: "", password: "", agreeToTerms: false as unknown as true } 
      : { email: "", password: "" },
    mode: "onBlur",
  });

  // Forgot password form
  const forgotForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  // Resend email form
  const resendForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  // Handle error from URL params (e.g., expired link)
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setServerError(urlError);
      if (urlError.toLowerCase().includes("expired")) {
        setShowResendForm(true);
      }
    }
  }, [searchParams]);


  // Reset form when switching between sign in and sign up
  useEffect(() => {
    if (isSignUp) {
      authForm.reset({ email: "", password: "", agreeToTerms: false as unknown as true });
    } else {
      authForm.reset({ email: "", password: "" });
    }
    setServerError(null);
  }, [isSignUp, authForm]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setServerError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setServerError(error.message);
      setGoogleLoading(false);
    }
  };

  const handleResendEmail = async (data: ForgotPasswordFormData) => {
    setResendLoading(true);
    setServerError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        },
      });
      if (error) throw error;
      setResendSuccess(true);
      setShowResendOption(false);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to resend email");
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToSignUp = () => {
    setConfirmationSent(false);
    setConfirmationEmail("");
    setShowResendOption(false);
    setResendSuccess(false);
    authForm.reset();
    setServerError(null);
  };

  const handleBackToLogin = () => {
    setShowResendForm(false);
    setShowForgotPassword(false);
    setResendSuccess(false);
    setResetEmailSent(false);
    setShowResetResendOption(false);
    forgotForm.reset();
    resendForm.reset();
    setServerError(null);
    router.replace("/login");
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setServerError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery&next=/reset-password`,
      });
      if (error) throw error;
      setResetEmailSent(true);
      setShowResetResendOption(false);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to send reset email");
    }
  };

  const handleAuthSubmit = async (data: SignInFormData | SignUpFormData) => {
    setServerError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
          },
        });
        if (error) throw error;
        setConfirmationEmail(data.email);
        setConfirmationSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Confirmation email sent screen
  if (confirmationSent) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-chart-1/20">
              <Mail className="h-7 w-7 text-chart-1" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Check your inbox</h1>
            <p className="text-muted-foreground text-center">
              We sent a confirmation link to
            </p>
            <p className="font-medium text-foreground">{confirmationEmail}</p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Click the link in the email to activate your account. If you don&apos;t see it, check your spam folder.
            </p>
          </div>

          {serverError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
              {serverError}
            </div>
          )}

          {resendSuccess && (
            <div className="p-3 rounded-lg bg-chart-1/10 text-chart-1 text-sm text-center">
              Email sent! Check your inbox.
            </div>
          )}

          <div className="space-y-3">
            {!showResendOption ? (
              <Button
                type="button"
                variant="outline"
                size="pill-lg"
                onClick={() => setShowResendOption(true)}
                className="w-full"
              >
                <Mail className="h-4 w-4" />
                Didn&apos;t receive an email?
              </Button>
            ) : (
              <Button
                type="button"
                size="pill-lg"
                onClick={() => handleResendEmail({ email: confirmationEmail })}
                disabled={resendLoading}
                className="w-full"
              >
                <RotateCw className={`h-4 w-4 ${resendLoading ? "animate-spin" : ""}`} />
                {resendLoading ? "Sending..." : "Resend email"}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="pill-lg"
              onClick={handleBackToSignUp}
              className="w-full text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Use a different email
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Forgot password screen
  if (showForgotPassword) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-chart-1/20">
              {resetEmailSent ? (
                <Mail className="h-7 w-7 text-chart-1" />
              ) : (
                <KeyRound className="h-7 w-7 text-chart-1" />
              )}
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {resetEmailSent ? "Check your inbox" : "Reset password"}
            </h1>
            <p className="text-muted-foreground text-center">
              {resetEmailSent
                ? "We sent a password reset link to"
                : "Enter your email and we'll send you a reset link"}
            </p>
            {resetEmailSent && forgotForm.getValues("email") && (
              <p className="font-medium text-foreground">{forgotForm.getValues("email")}</p>
            )}
          </div>

          {!resetEmailSent && (
            <form onSubmit={forgotForm.handleSubmit(handleForgotPassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  {...forgotForm.register("email")}
                  aria-invalid={!!forgotForm.formState.errors.email}
                />
                {forgotForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{forgotForm.formState.errors.email.message}</p>
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
                disabled={forgotForm.formState.isSubmitting}
                className="w-full"
              >
                <Mail className="h-4 w-4" />
                {forgotForm.formState.isSubmitting ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}

          {resetEmailSent && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
                </p>
              </div>

              {!showResetResendOption ? (
                <Button
                  type="button"
                  variant="outline"
                  size="pill-lg"
                  onClick={() => setShowResetResendOption(true)}
                  className="w-full"
                >
                  <Mail className="h-4 w-4" />
                  Didn&apos;t receive an email?
                </Button>
              ) : (
                <Button
                  type="button"
                  size="pill-lg"
                  onClick={() => forgotForm.handleSubmit(handleForgotPassword)()}
                  disabled={forgotForm.formState.isSubmitting}
                  className="w-full"
                >
                  <RotateCw className={`h-4 w-4 ${forgotForm.formState.isSubmitting ? "animate-spin" : ""}`} />
                  {forgotForm.formState.isSubmitting ? "Sending..." : "Resend email"}
                </Button>
              )}
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="pill-lg"
            onClick={handleBackToLogin}
            className="w-full text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Button>
        </div>
      </main>
    );
  }

  // Request new confirmation link screen (for expired links)
  if (showResendForm) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-chart-1/20">
              <RotateCw className="h-7 w-7 text-chart-1" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {resendSuccess ? "Check your inbox" : "Link expired"}
            </h1>
            <p className="text-muted-foreground text-center">
              {resendSuccess
                ? "We sent a new confirmation link to"
                : "Enter your email to receive a new confirmation link"}
            </p>
            {resendSuccess && resendForm.getValues("email") && (
              <p className="font-medium text-foreground">{resendForm.getValues("email")}</p>
            )}
          </div>

          {!resendSuccess && (
            <form onSubmit={resendForm.handleSubmit(handleResendEmail)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resend-email">Email</Label>
                <Input
                  id="resend-email"
                  type="email"
                  {...resendForm.register("email")}
                  aria-invalid={!!resendForm.formState.errors.email}
                />
                {resendForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{resendForm.formState.errors.email.message}</p>
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
                disabled={resendLoading}
                className="w-full"
              >
                <Mail className="h-4 w-4" />
                {resendLoading ? "Sending..." : "Send new link"}
              </Button>
            </form>
          )}

          {resendSuccess && (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm text-muted-foreground text-center">
                Click the link in the email to activate your account. If you don&apos;t see it, check your spam folder.
              </p>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="pill-lg"
            onClick={handleBackToLogin}
            className="w-full text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isSignUp ? "signup" : "signin"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              duration: 0.15,
              ease: "easeOut",
            }}
            className="space-y-8"
          >
            {/* Header - visually distinct for sign in vs sign up */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-chart-1/20">
                {isSignUp ? (
                  <UserPlus className="h-7 w-7 text-chart-1" />
                ) : (
                  <Activity className="h-7 w-7 text-chart-1" />
                )}
              </div>
              <h1 className="text-2xl font-semibold text-foreground">
                {isSignUp ? "Create Account" : "Welcome"}
              </h1>
              <p className="text-muted-foreground text-center">
                {isSignUp
                  ? "Sign up to start finding your rhythm"
                  : "Sign in to continue your rhythm"}
              </p>
            </div>

            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              size="pill-lg"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || authForm.formState.isSubmitting}
              className="w-full"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {googleLoading ? "Connecting..." : "Continue with Google"}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-input"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={authForm.handleSubmit(handleAuthSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...authForm.register("email")}
                  aria-invalid={!!authForm.formState.errors.email}
                />
                {authForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{authForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isSignUp && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setServerError(null);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground px-0 h-auto"
                    >
                      Forgot password?
                    </Button>
                  )}
                </div>
                <PasswordInput
                  id="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  {...authForm.register("password")}
                  aria-invalid={!!authForm.formState.errors.password}
                />
                {authForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{authForm.formState.errors.password.message}</p>
                )}
                {isSignUp && !authForm.formState.errors.password && (
                  <p className="text-xs text-muted-foreground">
                    Min 8 characters with uppercase, lowercase, and number
                  </p>
                )}
              </div>

              {serverError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
                  {serverError}
                </div>
              )}

              {/* Terms Agreement - only shown during signup */}
              {isSignUp && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={(authForm.watch as (name: "agreeToTerms") => boolean | undefined)("agreeToTerms") || false}
                      onCheckedChange={(checked) => {
                        (authForm.setValue as (name: "agreeToTerms", value: boolean) => void)("agreeToTerms", checked === true);
                        // Clear error when checked
                        if (checked) {
                          authForm.clearErrors("agreeToTerms" as keyof (SignInFormData | SignUpFormData));
                        }
                      }}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                    >
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="text-foreground underline underline-offset-4 hover:text-chart-1"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="text-foreground underline underline-offset-4 hover:text-chart-1"
                      >
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                  {isSignUp && 'agreeToTerms' in authForm.formState.errors && authForm.formState.errors.agreeToTerms && (
                    <p className="text-sm text-destructive">
                      {(authForm.formState.errors.agreeToTerms as { message?: string })?.message}
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                size="pill-lg"
                disabled={authForm.formState.isSubmitting}
                className="w-full"
              >
                {isSignUp ? (
                  <UserPlus className="h-4 w-4" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {authForm.formState.isSubmitting ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
              </Button>
            </form>

            {/* Toggle */}
            <div className="text-center pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">
                {isSignUp ? "Already have an account?" : "New to Rhythm?"}
              </p>
              <Button
                type="button"
                variant="outline"
                size="pill-lg"
                onClick={() => {
                  const newIsSignUp = !isSignUp;
                  setIsSignUp(newIsSignUp);
                  // Update URL without navigation
                  window.history.replaceState(null, "", newIsSignUp ? "/login?mode=signup" : "/login");
                }}
                className="w-full"
              >
                {isSignUp ? (
                  <LogIn className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {isSignUp ? "Sign in instead" : "Create an account"}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-chart-1/20 animate-pulse" />
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
