import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/dashboard';

  const supabase = await createClient();

  // Handle OAuth callback (Google, etc.) and PKCE email verification
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If this was a signup confirmation (PKCE flow), show welcome toast
      const redirectUrl = type === 'signup'
        ? `${origin}${next}?confirmed=true`
        : `${origin}${next}`;
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
  }

  // Handle email confirmation/recovery links
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'signup' | 'recovery' | 'email',
      token_hash,
    });

    if (!error) {
      // Add query param to show welcome toast for new signups
      const redirectUrl = type === 'signup' 
        ? `${origin}${next}?confirmed=true`
        : `${origin}${next}`;
      return NextResponse.redirect(redirectUrl);
    }

    // Handle specific errors
    if (error.message.toLowerCase().includes('expired')) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('This link has expired. Please request a new one.')}`
      );
    }
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=Invalid link`);
}

