import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Check if the request is for the auth page
  const requestUrl = new URL(request.url)
  const isAuthPage = requestUrl.pathname === '/auth'

  // Create a response with the request headers
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }))
        },
        setAll(cookies) {
          cookies.forEach(cookie => {
            // Update request and response cookies
            request.cookies.set(cookie)
            response.cookies.set(cookie)
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession()

  // If the user is not authenticated and trying to access a protected route,
  // redirect them to the auth page
  if (!session && !isAuthPage) {
    const redirectUrl = new URL('/auth', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If the user is authenticated and trying to access the auth page,
  // redirect them to the home page
  if (session && isAuthPage) {
    const redirectUrl = new URL('/', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api (API routes)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|_next/data|api|favicon.ico).*)',
  ],
}