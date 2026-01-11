"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { DbProfile } from "@/lib/supabase/types";
import { ArrowLeft, Check, Loader2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MAX_BIO_LENGTH = 500;
const MAX_DISPLAY_NAME_LENGTH = 100;

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // Fetch user and profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/login");
          return;
        }

        setUser(user);

        // Fetch profile from API
        const response = await fetch("/api/profile");
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
          setDisplayName(data.profile.display_name || "");
          setBio(data.profile.bio || "");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase, router]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      const data = await response.json();
      setProfile(data.profile);
      setSaved(true);

      // Clear saved indicator after 2 seconds
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Get user's initials for avatar fallback
  const getInitials = () => {
    if (displayName) {
      return displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "?";
  };

  // Get suggested display name from email (part before @)
  const getEmailUsername = () => {
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "";
  };

  // Get avatar URL from user metadata (Google OAuth provides this)
  const getAvatarUrl = () => {
    return (
      profile?.avatar_url ||
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      null
    );
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] pt-6 pb-24 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="gap-2 -ml-2 rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Profile Header Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={getAvatarUrl() || undefined} alt="Profile" />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl truncate">
                  {displayName || getEmailUsername() || "Your Profile"}
                </CardTitle>
                <CardDescription className="truncate">
                  {user?.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Profile Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your profile details. This information helps personalize
              your experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={getEmailUsername() || "How should we call you?"}
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  {displayName.length}/{MAX_DISPLAY_NAME_LENGTH} characters
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A bit about yourself..."
                  maxLength={MAX_BIO_LENGTH}
                  disabled={saving}
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {bio.length}/{MAX_BIO_LENGTH} characters
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                size="pill-lg"
                disabled={saving}
                className="w-full gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved!
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium truncate ml-4">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-medium">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Sign-in method</span>
              <span className="font-medium">
                {user?.app_metadata?.provider === "google" ? "Google" : "Email"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
