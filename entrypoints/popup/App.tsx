import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LibraryView } from '@/components/library/library-view';
import { resetSession } from '@/components/providers/query-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getMe } from '@/lib/api';
import { loginWithChromeIdentity, logout } from '@/lib/auth';
import { getUser } from '@/lib/storage';

async function fetchSession() {
  const stored = await getUser();
  if (!stored) return null;
  const me = await getMe();
  return me.user;
}

export default function App() {
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchSession,
    retry: false,
  });

  const signIn = useMutation({
    mutationFn: loginWithChromeIdentity,
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
    },
  });

  async function handleSignOut() {
    await logout();
    resetSession(queryClient);
  }

  function handleUnauthorized() {
    resetSession(queryClient);
  }

  if (meQuery.isPending) {
    return (
      <div className="cue-atmosphere flex h-full flex-col gap-4 p-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  const user = meQuery.data;
  if (!user) {
    const error =
      signIn.error instanceof Error
        ? signIn.error.message
        : signIn.error
          ? 'Sign-in failed'
          : null;

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
          className="mt-6 w-full max-w-56"
          disabled={signIn.isPending}
          onClick={() => signIn.mutate()}
        >
          {signIn.isPending ? 'Signing in…' : 'Sign in'}
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
