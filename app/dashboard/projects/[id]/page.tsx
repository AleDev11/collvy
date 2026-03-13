import { notFound } from "next/navigation"
import Link from "next/link"
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
import { EditProjectButton } from "./edit-project-button"
import { ProjectIcon } from "@/components/project-icon"
import { PROJECT_ICONS } from "@/lib/validations/project"
import {
  KanbanIcon,
  FileTextIcon,
  CalendarDaysIcon,
  CheckSquareIcon,
  AlertCircleIcon,
  MessageSquareIcon,
  ClockIcon,
  ActivityIcon,
  UsersIcon,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return date.toLocaleDateString()
}

function getInitials(name: string | null, email: string) {
  return name
    ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : email[0].toUpperCase()
}

export default async function ProjectPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()

  const [project, memberships, recentDocs, totalDocs] = await Promise.all([
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
        columns: {
          orderBy: { order: "asc" },
          include: {
            cards: {
              include: {
                comments: true,
                activityLogs: {
                  include: { user: { select: { id: true, name: true, email: true, image: true } } },
                  orderBy: { createdAt: "desc" },
                  take: 20,
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
    db.doc.findMany({
      where: { projectId: id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, icon: true, updatedAt: true },
    }),
    db.doc.count({ where: { projectId: id } }),
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

  // ── Stats ──────────────────────────────────────────────────
  const allCards = project.columns.flatMap((c) => c.cards)
  const now = new Date()
  const totalCards = allCards.length
  const totalColumns = project.columns.length
  const overdueCards = allCards.filter((c) => c.dueDate && c.dueDate < now).length
  const cardsWithDueDate = allCards.filter((c) => c.dueDate).length
  const totalComments = allCards.reduce((acc, c) => acc + c.comments.length, 0)
  const totalMembers = project.workspace.members.length

  // ── Recent activity ────────────────────────────────────────
  const recentActivity = project.columns
    .flatMap((col) => col.cards.flatMap((card) => card.activityLogs.map((log) => ({ ...log, cardTitle: card.title }))))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 12)

  // ── Cards per column (for the breakdown) ──────────────────
  const columnStats = project.columns.map((col) => ({
    name: col.name,
    color: col.color,
    count: col.cards.length,
  }))
  const maxColCount = Math.max(...columnStats.map((c) => c.count), 1)

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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">{project.workspace.name}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{project.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-8 p-8 overflow-y-auto">

          {/* Project header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <ProjectIcon icon={project.icon} className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{project.workspace.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <EditProjectButton projectId={project.id} currentName={project.name} currentIcon={project.icon} />
              <DeleteProjectButton projectId={project.id} />
            </div>
          </div>

          {/* Quick links */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href={`/dashboard/projects/${project.id}/kanban`}
              className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                <KanbanIcon className="h-4.5 w-4.5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Kanban Board</p>
                <p className="text-xs text-muted-foreground">{totalColumns} columns · {totalCards} cards</p>
              </div>
            </Link>
            <Link
              href={`/dashboard/projects/${project.id}/docs`}
              className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <FileTextIcon className="h-4.5 w-4.5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Docs</p>
                <p className="text-xs text-muted-foreground">{totalDocs} page{totalDocs === 1 ? "" : "s"}</p>
              </div>
            </Link>
            <div className="flex items-center gap-4 rounded-xl border bg-card p-4 opacity-50 cursor-not-allowed">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <CalendarDaysIcon className="h-4.5 w-4.5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Planner</p>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total cards</p>
                <CheckSquareIcon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-3xl font-bold">{totalCards}</p>
              <p className="mt-1 text-xs text-muted-foreground">{totalColumns} column{totalColumns === 1 ? "" : "s"}</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overdue</p>
                <AlertCircleIcon className="h-4 w-4 text-red-500/70" />
              </div>
              <p className={`text-3xl font-bold ${overdueCards > 0 ? "text-red-500" : ""}`}>{overdueCards}</p>
              <p className="mt-1 text-xs text-muted-foreground">{cardsWithDueDate} with due date</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Comments</p>
                <MessageSquareIcon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-3xl font-bold">{totalComments}</p>
              <p className="mt-1 text-xs text-muted-foreground">across all cards</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Members</p>
                <UsersIcon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-3xl font-bold">{totalMembers}</p>
              <p className="mt-1 text-xs text-muted-foreground">in workspace</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">

            {/* Column breakdown */}
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-5 text-sm font-semibold">Cards by column</h2>
              {columnStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">No columns yet.</p>
              ) : (
                <div className="space-y-3">
                  {columnStats.map((col) => (
                    <div key={col.name}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: col.color }}
                          />
                          <span className="font-medium truncate max-w-40">{col.name}</span>
                        </div>
                        <span className="text-muted-foreground tabular-nums">{col.count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(col.count / maxColCount) * 100}%`,
                            backgroundColor: col.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-5 text-sm font-semibold flex items-center gap-2">
                <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                Recent activity
              </h2>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <Avatar className="size-7 shrink-0 mt-0.5">
                        {log.user.image && <AvatarImage src={log.user.image} />}
                        <AvatarFallback className="text-[10px] font-semibold">
                          {getInitials(log.user.name, log.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          <span className="font-medium">{log.user.name ?? log.user.email}</span>
                          {" "}{log.message}
                          {" "}
                          <span className="text-muted-foreground">on</span>
                          {" "}
                          <span className="font-medium truncate">{log.cardTitle}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {timeAgo(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent docs */}
          {recentDocs.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-5 text-sm font-semibold flex items-center gap-2">
                <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                Recent documents
              </h2>
              <div className="divide-y">
                {recentDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/dashboard/projects/${project.id}/docs/${doc.id}`}
                    className="flex items-center gap-3 py-2.5 hover:text-foreground text-sm transition-colors group"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      {(PROJECT_ICONS as readonly string[]).includes(doc.icon) ? (
                        <ProjectIcon icon={doc.icon} className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <span className="text-sm leading-none">{doc.icon}</span>
                      )}
                    </div>
                    <span className="flex-1 truncate font-medium group-hover:underline underline-offset-2">
                      {doc.title || "Untitled"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {timeAgo(doc.updatedAt)}
                    </span>
                  </Link>
                ))}
              </div>
              {totalDocs > 5 && (
                <Link
                  href={`/dashboard/projects/${project.id}/docs`}
                  className="mt-3 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-3 border-t"
                >
                  View all {totalDocs} documents →
                </Link>
              )}
            </div>
          )}

          {/* Members */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-5 text-sm font-semibold flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              Workspace members
            </h2>
            <div className="flex flex-wrap gap-4">
              {project.workspace.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar className="size-9">
                    {m.user.image && <AvatarImage src={m.user.image} />}
                    <AvatarFallback className="text-xs font-semibold">
                      {getInitials(m.user.name, m.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none">{m.user.name ?? m.user.email}</p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
