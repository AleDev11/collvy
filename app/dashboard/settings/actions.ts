"use server"

import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod/v4"

async function getMembership(userId: string, workspaceId: string) {
  return db.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  })
}

export async function updateWorkspaceName(workspaceId: string, formData: FormData) {
  const session = await requireAuth()

  const parsed = z.string().min(2).max(50).trim().safeParse(formData.get("name"))
  if (!parsed.success) return { error: "Name must be between 2 and 50 characters" }

  const membership = await getMembership(session.user.id, workspaceId)
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { error: "Not authorized" }
  }

  await db.workspace.update({ where: { id: workspaceId }, data: { name: parsed.data } })
  revalidatePath("/dashboard/settings")
  return { success: true }
}

export async function regenerateInviteCode(workspaceId: string) {
  const session = await requireAuth()

  const membership = await getMembership(session.user.id, workspaceId)
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { error: "Not authorized" }
  }

  const newCode = crypto.randomUUID().replace(/-/g, "")
  await db.workspace.update({ where: { id: workspaceId }, data: { inviteCode: newCode } })
  revalidatePath("/dashboard/settings")
  return { success: true }
}

export async function updateMemberRole(memberId: string, workspaceId: string, role: string) {
  const session = await requireAuth()

  if (!["admin", "member"].includes(role)) return { error: "Invalid role" }

  const actor = await getMembership(session.user.id, workspaceId)
  if (!actor || actor.role !== "owner") {
    return { error: "Only the owner can change roles" }
  }

  const target = await db.workspaceMember.findUnique({ where: { id: memberId } })
  if (!target || target.workspaceId !== workspaceId) return { error: "Member not found" }
  if (target.userId === session.user.id) return { error: "Cannot change your own role" }
  if (target.role === "owner") return { error: "Cannot change owner role" }

  await db.workspaceMember.update({ where: { id: memberId }, data: { role } })
  revalidatePath("/dashboard/settings")
  return { success: true }
}

export async function removeMember(memberId: string, workspaceId: string) {
  const session = await requireAuth()

  const actor = await getMembership(session.user.id, workspaceId)
  if (!actor || !["owner", "admin"].includes(actor.role)) {
    return { error: "Not authorized" }
  }

  const target = await db.workspaceMember.findUnique({ where: { id: memberId } })
  if (!target || target.workspaceId !== workspaceId) return { error: "Member not found" }
  if (target.userId === session.user.id) return { error: "Cannot remove yourself" }
  if (target.role === "owner") return { error: "Cannot remove the owner" }
  if (actor.role === "admin" && target.role === "admin") {
    return { error: "Admins cannot remove other admins" }
  }

  await db.workspaceMember.delete({ where: { id: memberId } })
  revalidatePath("/dashboard/settings")
  return { success: true }
}

export async function leaveWorkspace(workspaceId: string) {
  const session = await requireAuth()

  const membership = await getMembership(session.user.id, workspaceId)
  if (!membership) return { error: "Not a member" }
  if (membership.role === "owner") {
    return { error: "The owner cannot leave. Transfer ownership first." }
  }

  await db.workspaceMember.delete({ where: { id: membership.id } })

  const other = await db.workspaceMember.findFirst({ where: { userId: session.user.id } })
  redirect(other ? "/dashboard" : "/onboarding")
}
