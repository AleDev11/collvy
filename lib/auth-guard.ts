import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

/**
 * Requires authenticated user. Redirects to /login if not.
 * Returns the session with guaranteed user.id.
 */
export async function requireAuth() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  return session as typeof session & { user: { id: string } }
}
