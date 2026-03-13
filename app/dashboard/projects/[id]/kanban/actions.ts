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
  const isMember = project.workspace.members.some((m) => m.userId === userId)
  if (!isMember) throw new Error("Access denied")
  return project
}

export async function createColumn(projectId: string, name: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  const last = await db.column.findFirst({ where: { projectId }, orderBy: { order: "desc" } })
  await db.column.create({ data: { name, projectId, order: (last?.order ?? -1) + 1 } })
  revalidatePath(`/dashboard/projects/${projectId}/kanban`)
}

export async function deleteColumn(columnId: string, projectId: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.column.delete({ where: { id: columnId } })
  revalidatePath(`/dashboard/projects/${projectId}/kanban`)
}

export async function renameColumn(columnId: string, projectId: string, name: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.column.update({ where: { id: columnId }, data: { name } })
  revalidatePath(`/dashboard/projects/${projectId}/kanban`)
}

export async function updateColumnColor(columnId: string, projectId: string, color: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.column.update({ where: { id: columnId }, data: { color } })
  revalidatePath(`/dashboard/projects/${projectId}/kanban`)
}

export async function reorderColumns(projectId: string, updates: { id: string; order: number }[]) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.$transaction(
    updates.map((u) => db.column.update({ where: { id: u.id }, data: { order: u.order } })),
  )
  revalidatePath(`/dashboard/projects/${projectId}/kanban`)
}

export async function createCard(columnId: string, projectId: string, title: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  const last = await db.card.findFirst({ where: { columnId }, orderBy: { order: "desc" } })
  await db.card.create({ data: { title, columnId, projectId, order: (last?.order ?? -1) + 1 } })
  revalidatePath(`/dashboard/projects/${projectId}/kanban`)
}

export async function deleteCard(cardId: string, projectId: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.card.delete({ where: { id: cardId } })
  revalidatePath(`/dashboard/projects/${projectId}/kanban`)
}

export async function updateCard(
  cardId: string,
  projectId: string,
  data: {
    title?: string
    description?: string | null
    dueDate?: Date | null
    assigneeId?: string | null
    labels?: string[]
  },
) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)

  const existing = await db.card.findUnique({
    where: { id: cardId },
    select: { title: true, description: true, dueDate: true, assigneeId: true, labels: true },
  })
  if (!existing) throw new Error("Card not found")

  const activities: string[] = []

  if (data.title !== undefined && data.title !== existing.title) {
    activities.push("changed the title")
  }
  if ("description" in data && data.description !== existing.description) {
    activities.push("updated the description")
  }
  if ("dueDate" in data) {
    if (!data.dueDate && existing.dueDate) {
      activities.push("removed the due date")
    } else if (data.dueDate && !existing.dueDate) {
      activities.push(
        `set the due date to ${new Date(data.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      )
    } else if (data.dueDate && existing.dueDate) {
      const newD = new Date(data.dueDate).toISOString().split("T")[0]
      const oldD = existing.dueDate.toISOString().split("T")[0]
      if (newD !== oldD) {
        activities.push(
          `changed the due date to ${new Date(data.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        )
      }
    }
  }
  if ("assigneeId" in data) {
    if (!data.assigneeId && existing.assigneeId) {
      activities.push("removed the assignee")
    } else if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
      const assignee = await db.user.findUnique({
        where: { id: data.assigneeId },
        select: { name: true, email: true },
      })
      activities.push(`assigned this to ${assignee?.name ?? assignee?.email ?? "someone"}`)
    }
  }
  if (data.labels !== undefined) {
    const oldLabels = existing.labels ?? []
    const added = data.labels.filter((l) => !oldLabels.includes(l))
    const removed = oldLabels.filter((l) => !data.labels!.includes(l))
    if (added.length) activities.push("added a label")
    if (removed.length) activities.push("removed a label")
  }

  await db.card.update({ where: { id: cardId }, data })
  for (const message of activities) {
    await db.activityLog.create({ data: { cardId, userId: session.user.id, message } })
  }

  revalidatePath(`/dashboard/projects/${projectId}/kanban`)
}

export async function saveCardPositions(
  projectId: string,
  cards: { id: string; columnId: string; order: number }[],
) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.$transaction(
    cards.map((c) =>
      db.card.update({ where: { id: c.id }, data: { columnId: c.columnId, order: c.order } }),
    ),
  )
  revalidatePath(`/dashboard/projects/${projectId}/kanban`)
}

export async function addComment(cardId: string, projectId: string, body: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.comment.create({ data: { body, cardId, authorId: session.user.id } })
  revalidatePath(`/dashboard/projects/${projectId}/kanban`)
}

export async function deleteComment(commentId: string, projectId: string) {
  const session = await requireAuth()
  await assertProjectAccess(projectId, session.user.id)
  await db.comment.delete({ where: { id: commentId } })
  revalidatePath(`/dashboard/projects/${projectId}/kanban`)
}
