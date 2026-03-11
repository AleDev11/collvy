import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { AppSidebar } from "@/components/app-sidebar"
import { ProjectIcon } from "@/components/project-icon"
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

export default async function DashboardPage() {
  const session = await requireAuth()

  const memberships = await db.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: { workspace: { include: { projects: true } } },
    orderBy: { createdAt: "asc" },
  })

  if (memberships.length === 0) {
    redirect("/onboarding")
  }

  const currentMembership = memberships[0]
  const workspace = currentMembership.workspace

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

  const projects = workspace.projects.map((p) => ({
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
                <BreadcrumbItem>
                  <BreadcrumbPage>{workspace.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div>
            <h1 className="text-2xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>
            <p className="text-muted-foreground mt-1">
              {projects.length === 0
                ? "No projects yet — create your first one."
                : `${projects.length} project${projects.length === 1 ? "" : "s"} in ${workspace.name}`}
            </p>
          </div>
          {projects.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">No projects yet</p>
                <a
                  href="/dashboard/projects/new"
                  className="mt-2 inline-block text-sm font-medium underline underline-offset-4"
                >
                  Create a project
                </a>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <a
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="group rounded-xl border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/50">
                    <ProjectIcon icon={project.icon} className="h-4 w-4" />
                  </div>
                  <p className="font-medium">{project.name}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
