import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const user = data?.user;

    // CHANGED: was unconditionally redirecting everyone to '/(dashboard)'
    // — a literal route-group folder name, not a real path, 404s every
    // time. Real path is '/dashboard'.
    //
    // Also now checks user_stats.personality_profile here, server-side,
    // right after the session is established — this is the one place
    // every login (first-time or returning) passes through, so it's
    // the correct place to decide "show onboarding" vs "go straight in",
    // rather than leaving that decision to a client page after the fact.
    if (user) {
      const { data: statsRow, error: statsError } = await supabase
        .from('user_stats')
        .select('personality_profile')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fail open on lookup error: if we can't determine status, send
      // them into the app rather than blocking login entirely. Worst
      // case they get asked the quiz again unnecessarily — annoying,
      // not broken. A hard failure here would lock people out of login.
      if (statsError) {
        console.error('Failed to check personality quiz status during login:', statsError);
        return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
      }

      const hasCompletedQuiz = !!statsRow?.personality_profile;

      if (!hasCompletedQuiz) {
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
      }
    }

    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
  }

  // No code present — something went wrong with the OAuth flow itself.
  // Send back to login rather than silently redirecting into the app.
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}