import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { getActiveWorkspaceId, pickActiveMembership } from "@/lib/active-workspace"
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
import { CalendarIcon, CircleIcon, CircleDotIcon, CircleCheckIcon, FlagIcon } from "lucide-react"

function isOverdue(dueDate: Date | null) {
  if (!dueDate) return false
  return dueDate < new Date()
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-500",
  important: "text-orange-500",
  medium: "text-blue-500",
  low: "text-gray-400",
}

const PROGRESS_ICONS: Record<string, React.FC<{ className?: string }>> = {
  not_started: CircleIcon,
  in_progress: CircleDotIcon,
  completed: CircleCheckIcon,
}

type MyTask = {
  id: string; title: string; priority: string; progress: string
  dueDate: Date | null; projectId: string; projectName: string; bucketName: string
}

type MembershipWithProjects = Awaited<ReturnType<typeof db.workspaceMember.findMany>>[number] & {
  workspace: { projects: Array<{ id: string; name: string; planBuckets: Array<{ name: string; tasks: MyTask[] }> }> }
}

function collectMyTasks(memberships: MembershipWithProjects[]): MyTask[] {
  const tasks: MyTask[] = []
  for (const m of memberships) {
    for (const p of m.workspace.projects) {
      for (const b of p.planBuckets) {
        for (const t of b.tasks) {
          tasks.push({ ...t, projectId: p.id, projectName: p.name, bucketName: b.name })
        }
      }
    }
  }
  tasks.sort((a, b) => {
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime()
    return 0
  })
  return tasks.slice(0, 8)
}

export default async function DashboardPage() {
  const session = await requireAuth()

  const memberships = await db.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: {
      workspace: {
        include: {
          projects: {
            include: {
              planBuckets: {
                include: {
                  tasks: {
                    where: {
                      assignees: { some: { userId: session.user.id } },
                      progress: { not: "completed" },
                    },
                    orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
                    take: 5,
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  if (memberships.length === 0) {
    redirect("/onboarding")
  }

  const activeWorkspaceId = await getActiveWorkspaceId()
  const currentMembership = pickActiveMembership(memberships, activeWorkspaceId)
  const workspace = currentMembership.workspace

  const user = {
    name: session.user.name ?? session.user.email ?? "User",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
  }

  const workspaces = [
    { id: currentMembership.workspace.id, name: currentMembership.workspace.name, slug: currentMembership.workspace.slug, role: currentMembership.role },
    ...memberships
      .filter((m) => m.workspaceId !== currentMembership.workspaceId)
      .map((m) => ({ id: m.workspace.id, name: m.workspace.name, slug: m.workspace.slug, role: m.role })),
  ]

  const projects = workspace.projects.map((p) => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
  }))

  // Gather all assigned tasks from all projects across all workspaces
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myTasksVisible = collectMyTasks(memberships as any)

  // Project stats
  const projectStats = await Promise.all(
    workspace.projects.map(async (p) => {
      const [total, completed] = await Promise.all([
        db.planTask.count({ where: { projectId: p.id } }),
        db.planTask.count({ where: { projectId: p.id, progress: "completed" } }),
      ])
      return { id: p.id, name: p.name, icon: p.icon, total, completed }
    }),
  )

  const projectPlural = projects.length === 1 ? "project" : "projects"
  const projectCountLabel =
    projects.length === 0
      ? "No projects yet — create your first one."
      : `${projects.length} ${projectPlural} in ${workspace.name}`

  return (
    <SidebarProvider>
      <AppSidebar user={user} workspaces={workspaces} projects={projects} />
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
                  <BreadcrumbPage>{workspace.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-8 p-6 overflow-y-auto">
          <div>
            <h1 className="text-2xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>
            <p className="text-muted-foreground mt-1">{projectCountLabel}</p>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <ProjectIcon icon="folder" className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium">No projects yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create your first project to get started</p>
                <a
                  href="/dashboard/projects/new"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Create a project
                </a>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Left: My Tasks + Projects */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* My Tasks */}
                {myTasksVisible.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold mb-3">My tasks</h2>
                    <div className="rounded-xl border bg-card divide-y">
                      {myTasksVisible.map((task) => {
                        const overdue = isOverdue(task.dueDate) && task.progress !== "completed"
                        const ProgressIcon = PROGRESS_ICONS[task.progress] ?? CircleIcon
                        return (
                          <a
                            key={task.id}
                            href={`/dashboard/projects/${task.projectId}/planner`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors group"
                          >
                            <ProgressIcon
                              className={`h-4 w-4 shrink-0 ${task.progress === "in_progress" ? "text-blue-500" : "text-muted-foreground/40"}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{task.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {task.projectName} · {task.bucketName}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {task.dueDate && (
                                <span className={`flex items-center gap-1 text-xs ${overdue ? "text-red-500" : "text-muted-foreground"}`}>
                                  <CalendarIcon className="h-3 w-3" />
                                  {formatDate(task.dueDate)}
                                </span>
                              )}
                              <FlagIcon className={`h-3 w-3 ${PRIORITY_COLORS[task.priority] ?? "text-muted-foreground"}`} />
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Projects grid */}
                <div>
                  <h2 className="text-sm font-semibold mb-3">Projects</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {projectStats.map((project) => {
                      const pct = project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0
                      return (
                        <a
                          key={project.id}
                          href={`/dashboard/projects/${project.id}`}
                          className="group rounded-xl border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
                        >
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                              <ProjectIcon icon={project.icon} className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {project.completed}/{project.total}
                            </span>
                          </div>
                          <p className="font-medium">{project.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{workspace.name}</p>
                          {project.total > 0 && (
                            <div className="mt-3">
                              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{pct}% complete</p>
                            </div>
                          )}
                        </a>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Quick stats */}
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold">Overview</h2>
                <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">
                  {projectStats.map((p) => {
                    const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
                    return (
                      <div key={p.id}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium truncate max-w-30">{p.name}</span>
                          <span className="text-muted-foreground tabular-nums">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  {projectStats.length === 0 && (
                    <p className="text-xs text-muted-foreground">No projects yet.</p>
                  )}
                </div>

                <a
                  href="/dashboard/projects/new"
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
                >
                  + New project
                </a>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
