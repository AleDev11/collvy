import { db } from "@/lib/db"
import { PLAN_LIMITS } from "@/lib/plans"
import type { PlanTier } from "@/lib/plans"

export async function getWorkspaceSubscription(workspaceId: string) {
  const sub = await db.subscription.findUnique({ where: { workspaceId } })
  return sub
}

export function getEffectiveTier(sub: { tier: string } | null): PlanTier {
  if (!sub) return "FREE"
  return sub.tier as PlanTier
}

export async function checkMemberLimit(workspaceId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const [sub, count] = await Promise.all([
    db.subscription.findUnique({ where: { workspaceId } }),
    db.workspaceMember.count({ where: { workspaceId } }),
  ])
  const tier = getEffectiveTier(sub)
  const limit = PLAN_LIMITS[tier].members
  return { allowed: limit === -1 || count < limit, current: count, limit }
}

export async function checkProjectLimit(workspaceId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const [sub, count] = await Promise.all([
    db.subscription.findUnique({ where: { workspaceId } }),
    db.project.count({ where: { workspaceId } }),
  ])
  const tier = getEffectiveTier(sub)
  const limit = PLAN_LIMITS[tier].projects
  return { allowed: limit === -1 || count < limit, current: count, limit }
}
