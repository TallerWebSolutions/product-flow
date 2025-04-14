'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

// This function should only be used in Server Components or Server Actions
export async function createClient() {
  // Create a server client Supabase client with cookies from the request
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const cookieStore = await cookies()
          return cookieStore.getAll()
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

// Use this function to get session data in Server Components
export async function getServerSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}