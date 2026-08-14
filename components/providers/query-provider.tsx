import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { isUnauthorized } from '@/lib/utils';

export function resetSession(queryClient: QueryClient) {
  queryClient.setQueryData(['me'], null);
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== 'me',
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (isUnauthorized(error)) return false;
              return failureCount < 3;
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
