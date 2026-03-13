import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DocEditor } from "./doc-editor"

export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>
}) {
  const { id, docId } = await params
  const session = await requireAuth()

  const [doc, project, memberships] = await Promise.all([
    db.doc.findUnique({ where: { id: docId } }),
    db.project.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, image: true } },
              },
            },
          },
        },
      },
    }),
    db.workspaceMember.findMany({
      where: { userId: session.user.id },
      include: { workspace: { include: { projects: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ])

  if (!project || !doc || doc.projectId !== id) notFound()

  const isMember = memberships.some((m) => m.workspaceId === project.workspaceId)
  if (!isMember) notFound()

  const allDocs = await db.doc.findMany({
    where: { projectId: id },
    orderBy: [{ order: "asc" }],
    select: { id: true, title: true, icon: true, parentId: true, order: true },
  })

  const currentMembership = memberships.find((m) => m.workspaceId === project.workspaceId)!
  const user = {
    name: session.user.name ?? session.user.email ?? "User",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
  }
  const workspaces = memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    role: m.role,
  }))
  const sidebarProjects = currentMembership.workspace.projects.map((p) => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
  }))

  return (
    <SidebarProvider>
      <AppSidebar user={user} workspaces={workspaces} projects={sidebarProjects} />
      <SidebarInset className="overflow-hidden">
        <DocEditor
          doc={{
            id: doc.id,
            title: doc.title,
            icon: doc.icon,
            content: doc.content as object,
            projectId: doc.projectId,
          }}
          allDocs={allDocs}
          projectId={id}
          projectName={project.name}
          workspaceName={project.workspace.name}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
