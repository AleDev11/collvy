import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { KanbanBoard } from "./kanban-board"

export default async function KanbanPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()

  const [project, memberships] = await Promise.all([
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
        columns: {
          orderBy: { order: "asc" },
          include: {
            cards: {
              orderBy: { order: "asc" },
              include: {
                assignee: { select: { id: true, name: true, email: true, image: true } },
                comments: {
                  include: { author: { select: { id: true, name: true, email: true, image: true } } },
                  orderBy: { createdAt: "asc" },
                },
                activityLogs: {
                  include: { user: { select: { id: true, name: true, email: true, image: true } } },
                  orderBy: { createdAt: "asc" },
                },
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

  const projects = currentMembership.workspace.projects.map((p) => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
  }))

  // Serialize dates for client components
  const initialColumns = project.columns.map((col) => ({
    ...col,
    cards: col.cards.map((card) => ({
      ...card,
      dueDate: card.dueDate ? card.dueDate.toISOString() : null,
      comments: card.comments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
      activityLogs: card.activityLogs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    })),
  }))

  const members = project.workspace.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
  }))

  const currentUser = {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? "",
    image: session.user.image ?? null,
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} workspaces={workspaces} projects={projects} />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    {project.workspace.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={`/dashboard/projects/${project.id}`}>
                    {project.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Kanban</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <KanbanBoard
            projectId={project.id}
            initialColumns={initialColumns}
            members={members}
            currentUserId={session.user.id}
            currentUser={currentUser}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
