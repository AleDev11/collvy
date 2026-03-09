import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const publicRoutes = ["/", "/login", "/register"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/api/auth")
  )

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
}
