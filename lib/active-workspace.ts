import { cookies } from "next/headers"

/**
 * Returns the active workspace ID from cookie, or null if not set.
 * Server-side only.
 */
export async function getActiveWorkspaceId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get("activeWorkspaceId")?.value ?? null
}

/**
 * Given all memberships, pick the one matching the active workspace cookie.
 * Falls back to the first membership if the cookie is missing or stale.
 */
export function pickActiveMembership<T extends { workspaceId: string }>(
  memberships: T[],
  activeWorkspaceId: string | null,
): T {
  if (activeWorkspaceId) {
    const match = memberships.find((m) => m.workspaceId === activeWorkspaceId)
    if (match) return match
  }
  return memberships[0]
}
