"use server"

import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { createProjectSchema } from "@/lib/validations/project"
import { redirect } from "next/navigation"

async function getWorkspaceForUser(userId: string) {
  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  })
  return membership?.workspaceId ?? null
}

export async function createProject(formData: FormData) {
  const session = await requireAuth()

  const raw = {
    name: formData.get("name"),
    icon: formData.get("icon") || "folder",
  }

  const result = createProjectSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const workspaceId = await getWorkspaceForUser(session.user.id)
  if (!workspaceId) redirect("/onboarding")

  const project = await db.project.create({
    data: {
      name: result.data.name,
      icon: result.data.icon,
      workspaceId,
    },
  })

  redirect(`/dashboard/projects/${project.id}`)
}

export async function deleteProject(projectId: string) {
  const session = await requireAuth()

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { workspace: { include: { members: { where: { userId: session.user.id } } } } },
  })

  if (!project || project.workspace.members.length === 0) {
    return { error: "Project not found" }
  }

  await db.project.delete({ where: { id: projectId } })
  redirect("/dashboard")
}
