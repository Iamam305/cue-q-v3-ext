import { useEffect, useState } from 'react';
import { LibraryView } from '@/components/library/library-view';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getMe } from '@/lib/api';
import { loginWithChromeIdentity, logout } from '@/lib/auth';
import { type CueqUser, getUser } from '@/lib/storage';

type AuthState = 'loading' | 'signed_out' | 'signed_in';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<CueqUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setError(null);
      try {
        const stored = await getUser();
        if (!stored) {
          if (!cancelled) {
            setAuthState('signed_out');
            setUser(null);
          }
          return;
        }

        const me = await getMe();
        if (cancelled) return;
        setUser(me.user);
        setAuthState('signed_in');
      } catch {
        if (cancelled) return;
        setUser(null);
        setAuthState('signed_out');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignIn() {
    setSigningIn(true);
    setError(null);
    try {
      const nextUser = await loginWithChromeIdentity();
      setUser(nextUser);
      setAuthState('signed_in');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await logout();
    setUser(null);
    setAuthState('signed_out');
  }

  function handleUnauthorized() {
    setUser(null);
    setAuthState('signed_out');
  }

  if (authState === 'loading') {
    return (
      <div className="cue-atmosphere flex h-full flex-col gap-4 p-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (authState === 'signed_out' || !user) {
    return (
      <div className="cue-atmosphere flex h-full flex-col items-center justify-center px-6 py-8 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Cue Q
        </h1>
        <p className="mt-2 max-w-[16rem] text-sm text-muted-foreground">
          Sign in to access your prompt library.
        </p>
        {error ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          className="mt-6 w-full max-w-[14rem]"
          disabled={signingIn}
          onClick={() => void handleSignIn()}
        >
          {signingIn ? 'Signing in…' : 'Sign in'}
        </Button>
      </div>
    );
  }

  return (
    <LibraryView
      user={user}
      onSignOut={() => void handleSignOut()}
      onUnauthorized={handleUnauthorized}
    />
  );
}
