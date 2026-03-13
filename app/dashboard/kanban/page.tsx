import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { getActiveWorkspaceId, pickActiveMembership } from "@/lib/active-workspace"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { KanbanIcon } from "lucide-react"

export default async function KanbanIndexPage() {
  const session = await requireAuth()

  const memberships = await db.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: { workspace: { include: { projects: true } } },
    orderBy: { createdAt: "asc" },
  })

  if (memberships.length === 0) redirect("/onboarding")

  const activeWorkspaceId = await getActiveWorkspaceId()
  const currentMembership = pickActiveMembership(memberships, activeWorkspaceId)
  const projects = currentMembership.workspace.projects

  // If there's exactly one project, go straight to its kanban
  if (projects.length === 1) {
    redirect(`/dashboard/projects/${projects[0].id}/kanban`)
  }

  // Multiple projects — let user pick
  const user = {
    name: session.user.name ?? session.user.email ?? "User",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
  }

  const workspaces = [
    { id: currentMembership.workspace.id, name: currentMembership.workspace.name, slug: currentMembership.workspace.slug, role: currentMembership.role },
    ...memberships.filter((m) => m.workspaceId !== currentMembership.workspaceId).map((m) => ({ id: m.workspace.id, name: m.workspace.name, slug: m.workspace.slug, role: m.role })),
  ]

  const sidebarProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
  }))

  return (
    <SidebarProvider>
      <AppSidebar user={user} workspaces={workspaces} projects={sidebarProjects} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Kanban</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-8">
          {projects.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <KanbanIcon className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium">No projects yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a project to start using the kanban board
                </p>
                <a
                  href="/dashboard/projects/new"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Create a project
                </a>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-semibold">Kanban</h1>
                <p className="mt-1 text-muted-foreground">Choose a project to open its board</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <a
                    key={project.id}
                    href={`/dashboard/projects/${project.id}/kanban`}
                    className="group flex items-center gap-4 rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <KanbanIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{project.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {currentMembership.workspace.name}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
