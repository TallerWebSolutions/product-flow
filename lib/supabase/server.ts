import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export const createClient = () => {
  const cookieStore = cookies()

  // Create a server client Supabase client with cookies from the request
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await cookieStore).getAll()
        },
        async setAll(cookiesToSet: ResponseCookie[]) {
          try {
            const cookieStore = await cookies()
            for (const cookie of cookiesToSet) {
              cookieStore.set(cookie)
            }
          } catch (error) {
            console.error('Error setting cookies:', error)
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}