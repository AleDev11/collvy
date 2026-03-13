"use server"

import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { redirect } from "next/navigation"
import { z } from "zod/v4"
import { checkMemberLimit } from "@/lib/billing"

const schema = z.object({
  code: z.string().min(1, "Invite code is required").max(64).trim(),
})

export async function joinWorkspace(formData: FormData) {
  const session = await requireAuth()

  const { success } = rateLimit(`join:${session.user.id}`)
  if (!success) {
    return { error: "Too many attempts. Please try again later." }
  }

  const result = schema.safeParse({ code: formData.get("code") })
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const workspace = await db.workspace.findUnique({
    where: { inviteCode: result.data.code },
  })

  if (!workspace) {
    // Generic message — don't reveal if code format is valid
    return { error: "Invalid or expired invite code" }
  }

  const existing = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: session.user.id,
        workspaceId: workspace.id,
      },
    },
  })

  if (existing) {
    redirect("/dashboard")
  }

  const limit = await checkMemberLimit(workspace.id)
  if (!limit.allowed) {
    return { error: `This workspace has reached its member limit (${limit.current}/${limit.limit}). Ask the owner to upgrade their plan.` }
  }

  await db.workspaceMember.create({
    data: {
      userId: session.user.id,
      workspaceId: workspace.id,
      role: "member",
    },
  })

  redirect("/dashboard")
}
