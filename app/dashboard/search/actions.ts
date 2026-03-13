"use server"

import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"

export type SearchResult = {
  type: "project" | "task" | "card" | "doc"
  id: string
  title: string
  subtitle: string
  url: string
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const session = await requireAuth()
  const q = query.trim()
  if (q.length < 2) return []

  // Get all workspace IDs the user belongs to
  const memberships = await db.workspaceMember.findMany({
    where: { userId: session.user.id },
    select: { workspaceId: true },
  })
  const workspaceIds = memberships.map((m) => m.workspaceId)

  const [projects, tasks, cards, docs] = await Promise.all([
    db.project.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        name: { contains: q, mode: "insensitive" },
      },
      include: { workspace: { select: { name: true } } },
      take: 4,
    }),

    db.planTask.findMany({
      where: {
        project: { workspaceId: { in: workspaceIds } },
        title: { contains: q, mode: "insensitive" },
      },
      include: {
        project: { select: { id: true, name: true } },
        bucket: { select: { name: true } },
      },
      take: 6,
    }),

    db.card.findMany({
      where: {
        project: { workspaceId: { in: workspaceIds } },
        title: { contains: q, mode: "insensitive" },
      },
      include: {
        project: { select: { id: true, name: true } },
        column: { select: { name: true } },
      },
      take: 6,
    }),

    db.doc.findMany({
      where: {
        project: { workspaceId: { in: workspaceIds } },
        title: { contains: q, mode: "insensitive" },
      },
      include: { project: { select: { id: true, name: true } } },
      take: 4,
    }),
  ])

  const results: SearchResult[] = [
    ...projects.map((p) => ({
      type: "project" as const,
      id: p.id,
      title: p.name,
      subtitle: p.workspace.name,
      url: `/dashboard/projects/${p.id}`,
    })),
    ...tasks.map((t) => ({
      type: "task" as const,
      id: t.id,
      title: t.title,
      subtitle: `${t.project.name} · ${t.bucket.name}`,
      url: `/dashboard/projects/${t.project.id}/planner`,
    })),
    ...cards.map((c) => ({
      type: "card" as const,
      id: c.id,
      title: c.title,
      subtitle: `${c.project.name} · ${c.column.name}`,
      url: `/dashboard/projects/${c.project.id}/kanban`,
    })),
    ...docs.map((d) => ({
      type: "doc" as const,
      id: d.id,
      title: d.title,
      subtitle: d.project.name,
      url: `/dashboard/projects/${d.project.id}/docs/${d.id}`,
    })),
  ]

  return results
}
