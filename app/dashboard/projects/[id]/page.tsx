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
import { DeleteProjectButton } from "./delete-project-button"
import { ProjectIcon } from "@/components/project-icon"
import { KanbanIcon, FileTextIcon, CalendarDaysIcon } from "lucide-react"

export default async function ProjectPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()

  const [project, memberships] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: { workspace: true },
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

  return (
    <SidebarProvider>
      <AppSidebar user={user} workspaces={workspaces} projects={projects} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
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
                <BreadcrumbItem>
                  <BreadcrumbPage>{project.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <ProjectIcon icon={project.icon} className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              <p className="text-muted-foreground text-sm mt-1">{project.workspace.name}</p>
            </div>
            <DeleteProjectButton projectId={project.id} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-4 rounded-xl border bg-card p-5 opacity-60">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                <KanbanIcon className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="font-medium">Kanban Board</p>
                <p className="text-xs text-muted-foreground mt-0.5">Coming soon</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border bg-card p-5 opacity-60">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                <FileTextIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Docs</p>
                <p className="text-xs text-muted-foreground mt-0.5">Coming soon</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border bg-card p-5 opacity-60">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <CalendarDaysIcon className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium">Planner</p>
                <p className="text-xs text-muted-foreground mt-0.5">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
