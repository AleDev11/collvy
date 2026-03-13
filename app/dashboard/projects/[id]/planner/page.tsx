import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { PlannerShell } from "./planner-shell"

export default async function PlannerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requireAuth()

  const [project, memberships] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, email: true, image: true } } },
            },
          },
        },
        planBuckets: {
          orderBy: { order: "asc" },
          include: {
            tasks: {
              orderBy: { order: "asc" },
              include: {
                assignees: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
                checklist: { orderBy: { order: "asc" } },
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

  if (!project) notFound()

  const isMember = memberships.some((m) => m.workspaceId === project.workspaceId)
  if (!isMember) notFound()

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

  // Serialize dates to ISO strings for client
  const buckets = project.planBuckets.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    tasks: b.tasks.map((t) => ({
      ...t,
      startDate: t.startDate?.toISOString() ?? null,
      dueDate: t.dueDate?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      checklist: t.checklist.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    })),
  }))

  const members = project.workspace.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
    role: m.role,
  }))

  return (
    <SidebarProvider>
      <AppSidebar user={user} workspaces={workspaces} projects={sidebarProjects} />
      <SidebarInset className="overflow-hidden">
        <PlannerShell
          buckets={buckets}
          members={members}
          projectId={id}
          projectName={project.name}
          workspaceName={project.workspace.name}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
