"use server"

import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function verifyAccess(projectId: string, userId: string) {
  return db.project.findFirst({
    where: { id: projectId, workspace: { members: { some: { userId } } } },
  })
}

async function verifyDocAccess(docId: string, userId: string) {
  return db.doc.findFirst({
    where: { id: docId, project: { workspace: { members: { some: { userId } } } } },
  })
}

export async function createDoc(projectId: string, parentId?: string | null) {
  const session = await requireAuth()
  if (!(await verifyAccess(projectId, session.user.id))) return { error: "Not found" }

  const count = await db.doc.count({ where: { projectId } })
  const doc = await db.doc.create({
    data: {
      title: "Untitled",
      content: {},
      projectId,
      authorId: session.user.id,
      parentId: parentId ?? null,
      order: count,
    },
  })
  revalidatePath(`/dashboard/projects/${projectId}/docs`)
  redirect(`/dashboard/projects/${projectId}/docs/${doc.id}`)
}

export async function updateDocContent(docId: string, title: string, content: object) {
  const session = await requireAuth()
  const doc = await verifyDocAccess(docId, session.user.id)
  if (!doc) return { error: "Not found" }

  await db.doc.update({ where: { id: docId }, data: { title, content } })

  // Save version snapshot
  await db.docVersion.create({
    data: { docId, title, content, authorId: session.user.id },
  })

  // Keep only the last 50 versions
  const old = await db.docVersion.findMany({
    where: { docId },
    orderBy: { createdAt: "desc" },
    skip: 50,
    select: { id: true },
  })
  if (old.length > 0) {
    await db.docVersion.deleteMany({ where: { id: { in: old.map((v) => v.id) } } })
  }

  revalidatePath(`/dashboard/projects/${doc.projectId}/docs`)
}

export async function updateDocIcon(docId: string, icon: string) {
  const session = await requireAuth()
  const doc = await verifyDocAccess(docId, session.user.id)
  if (!doc) return { error: "Not found" }
  await db.doc.update({ where: { id: docId }, data: { icon } })
  revalidatePath(`/dashboard/projects/${doc.projectId}/docs`)
  revalidatePath(`/dashboard/projects/${doc.projectId}/docs/${docId}`)
}

export async function deleteDoc(docId: string, projectId: string) {
  const session = await requireAuth()
  const doc = await verifyDocAccess(docId, session.user.id)
  if (!doc) return { error: "Not found" }
  await db.doc.delete({ where: { id: docId } })
  revalidatePath(`/dashboard/projects/${projectId}/docs`)
  redirect(`/dashboard/projects/${projectId}/docs`)
}

// ── Version history ───────────────────────────────────────────────────────────

export async function getDocVersions(docId: string) {
  const session = await requireAuth()
  const doc = await verifyDocAccess(docId, session.user.id)
  if (!doc) return []

  return db.docVersion.findMany({
    where: { docId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function restoreDocVersion(docId: string, versionId: string) {
  const session = await requireAuth()
  const version = await db.docVersion.findFirst({
    where: {
      id: versionId,
      docId,
      doc: { project: { workspace: { members: { some: { userId: session.user.id } } } } },
    },
    include: { doc: true },
  })
  if (!version) return { error: "Not found" }

  await db.doc.update({
    where: { id: docId },
    data: { title: version.title, content: version.content as object },
  })

  revalidatePath(`/dashboard/projects/${version.doc.projectId}/docs`)
  revalidatePath(`/dashboard/projects/${version.doc.projectId}/docs/${docId}`)
}
