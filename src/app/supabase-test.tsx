'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function SupabaseTest() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        setMessage(user ? "Supabase Auth is connected!" : "Not signed in, but Supabase connection works!")
      } catch (error) {
        setMessage("Error connecting to Supabase: " + (error as Error).message)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [supabase])

  const testConnection = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('nonexistent_table').select('*').limit(1)

      if (error && error.code === '42P01') { // Table doesn't exist error
        setMessage("Supabase connection works! Got expected error: Table doesn't exist")
      } else if (error) {
        setMessage(`Other error: ${error.message}`)
      } else {
        setMessage("Connection successful, table exists: " + JSON.stringify(data))
      }
    } catch (error) {
      setMessage("Error connecting to Supabase: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded border p-4 bg-slate-50 w-full max-w-md">
      <h2 className="text-lg font-bold mb-2">Supabase Test</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <p className="mb-4">{message}</p>
          {user && (
            <p className="mb-4">Logged in as: {user.email}</p>
          )}
          <Button onClick={testConnection} disabled={loading}>
            Test Supabase Connection
          </Button>
        </>
      )}
    </div>
  )
}