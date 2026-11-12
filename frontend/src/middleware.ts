import { NextResponse } from "next/server"
import { auth } from "@/auth"

// Runs in the Node.js runtime (not Edge) because `auth()` is built with the
// Prisma adapter, which needs Node APIs.
export const runtime = "nodejs"

const PUBLIC_PATHS = new Set(["/", "/login"])

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth?.user

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("redirect", pathname)
    const redirectRes = NextResponse.redirect(loginUrl)
    redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    redirectRes.headers.set("Pragma", "no-cache")
    redirectRes.headers.set("Expires", "0")
    return redirectRes
  }

  if (pathname.startsWith("/admin")) {
    // @ts-expect-error role is added to the session in auth.config.ts
    const role = req.auth?.user?.role
    if (role !== "ADMIN") {
      const redirectRes = NextResponse.redirect(new URL("/dashboard", req.url))
      redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
      return redirectRes
    }
  }

  const response = NextResponse.next()
  // Enforce zero caching on all authenticated routes so that logging out and
  // pressing the browser's back button never serves cached user data from bfcache.
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  response.headers.set("Pragma", "no-cache")
  response.headers.set("Expires", "0")
  return response
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
