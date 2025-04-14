'use server'

import { createClient } from '@/lib/supabase/server'

export type AuthResult = {
  success?: boolean
  error?: string
}

export async function login(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  try {
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Login error:', error)
    return { error: 'An unexpected error occurred during login' }
  }
}

export async function register(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string

  if (!email || !password || !name) {
    return { error: 'Name, email, and password are required' }
  }

  try {
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Registration error:', error)
    return { error: 'An unexpected error occurred during registration' }
  }
}

export async function logout(): Promise<AuthResult> {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { error: 'An unexpected error occurred during logout' }
  }
}

export async function getSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}