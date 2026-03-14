'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState ensures a new QueryClient is created per user session (not shared across requests)
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 60 * 1000,  // treat cached data as fresh for 1 minute
      },
    },
  }))

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  )
}