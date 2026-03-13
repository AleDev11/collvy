"use server"

import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { createProjectSchema } from "@/lib/validations/project"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getActiveWorkspaceId, pickActiveMembership } from "@/lib/active-workspace"
import { checkProjectLimit } from "@/lib/billing"

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

  const memberships = await db.workspaceMember.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  })
  if (memberships.length === 0) redirect("/onboarding")

  const activeWorkspaceId = await getActiveWorkspaceId()
  const membership = pickActiveMembership(memberships, activeWorkspaceId)
  const workspaceId = membership.workspaceId

  const limit = await checkProjectLimit(workspaceId)
  if (!limit.allowed) {
    return { error: `Project limit reached (${limit.current}/${limit.limit}). Upgrade your plan to create more projects.` }
  }

  const project = await db.project.create({
    data: {
      name: result.data.name,
      icon: result.data.icon,
      workspaceId,
    },
  })

  redirect(`/dashboard/projects/${project.id}`)
}

export async function updateProject(projectId: string, name: string, icon: string) {
  const session = await requireAuth()

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { workspace: { include: { members: { where: { userId: session.user.id } } } } },
  })

  if (!project || project.workspace.members.length === 0) {
    return { error: "Project not found" }
  }

  await db.project.update({ where: { id: projectId }, data: { name, icon } })
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath("/dashboard")
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
