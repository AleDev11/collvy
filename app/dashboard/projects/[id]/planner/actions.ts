"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"

async function assertProjectAccess(projectId: string, userId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { workspace: { include: { members: true } } },
  })
  if (!project) throw new Error("Project not found")
  if (!project.workspace.members.some((m) => m.userId === userId)) throw new Error("Access denied")
  return project
}

const revalidate = (projectId: string) =>
  revalidatePath(`/dashboard/projects/${projectId}/planner`)

// ── Buckets ──────────────────────────────────────────────────────────────────

export async function createBucket(projectId: string, name: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  const last = await db.planBucket.findFirst({ where: { projectId }, orderBy: { order: "desc" } })
  const bucket = await db.planBucket.create({ data: { name, projectId, order: (last?.order ?? -1) + 1 } })
  revalidate(projectId)
  return {
    ...bucket,
    createdAt: bucket.createdAt.toISOString(),
    updatedAt: bucket.updatedAt.toISOString(),
    tasks: [],
  }
}

export async function renameBucket(bucketId: string, projectId: string, name: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.planBucket.update({ where: { id: bucketId }, data: { name } })
  revalidate(projectId)
}

export async function deleteBucket(bucketId: string, projectId: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.planBucket.delete({ where: { id: bucketId } })
  revalidate(projectId)
}

export async function reorderBuckets(
  projectId: string,
  updates: { id: string; order: number }[],
) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.$transaction(updates.map((u) => db.planBucket.update({ where: { id: u.id }, data: { order: u.order } })))
  revalidate(projectId)
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export async function createTask(bucketId: string, projectId: string, title: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  const last = await db.planTask.findFirst({ where: { bucketId }, orderBy: { order: "desc" } })
  const task = await db.planTask.create({
    data: { title, bucketId, projectId, order: (last?.order ?? -1) + 1 },
    include: { assignees: { include: { user: true } }, checklist: true },
  })
  revalidate(projectId)
  return {
    ...task,
    startDate: task.startDate?.toISOString() ?? null,
    dueDate: task.dueDate?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    checklist: task.checklist.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
  }
}

export async function updateTask(
  taskId: string,
  projectId: string,
  data: {
    title?: string
    notes?: string | null
    priority?: string
    progress?: string
    startDate?: Date | null
    dueDate?: Date | null
    labels?: string[]
  },
) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.planTask.update({ where: { id: taskId }, data })
  revalidate(projectId)
}

export async function deleteTask(taskId: string, projectId: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.planTask.delete({ where: { id: taskId } })
  revalidate(projectId)
}

export async function saveTaskPositions(
  projectId: string,
  updates: { id: string; bucketId: string; order: number }[],
) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.$transaction(
    updates.map((u) =>
      db.planTask.update({ where: { id: u.id }, data: { bucketId: u.bucketId, order: u.order } }),
    ),
  )
  revalidate(projectId)
}

// ── Assignees ────────────────────────────────────────────────────────────────

export async function setTaskAssignees(taskId: string, projectId: string, userIds: string[]) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.$transaction([
    db.planTaskAssignee.deleteMany({ where: { taskId } }),
    db.planTaskAssignee.createMany({ data: userIds.map((userId) => ({ taskId, userId })) }),
  ])
  revalidate(projectId)
}

// ── Checklist ────────────────────────────────────────────────────────────────

export async function addChecklistItem(taskId: string, projectId: string, title: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  const last = await db.planChecklist.findFirst({ where: { taskId }, orderBy: { order: "desc" } })
  const item = await db.planChecklist.create({
    data: { title, taskId, order: (last?.order ?? -1) + 1 },
  })
  revalidate(projectId)
  return item
}

export async function toggleChecklistItem(itemId: string, taskId: string, projectId: string, checked: boolean) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.planChecklist.update({ where: { id: itemId }, data: { checked } })
  revalidate(projectId)
}

export async function deleteChecklistItem(itemId: string, taskId: string, projectId: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.planChecklist.delete({ where: { id: itemId } })
  revalidate(projectId)
}
