import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { getActiveWorkspaceId, pickActiveMembership } from "@/lib/active-workspace"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { NewProjectForm } from "./new-project-form"

export default async function NewProjectPage() {
  const session = await requireAuth()

  const memberships = await db.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: { workspace: { include: { projects: true } } },
    orderBy: { createdAt: "asc" },
  })

  if (memberships.length === 0) redirect("/onboarding")

  const activeWorkspaceId = await getActiveWorkspaceId()
  const currentMembership = pickActiveMembership(memberships, activeWorkspaceId)

  const user = {
    name: session.user.name ?? session.user.email ?? "User",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
  }

  const workspaces = [
    { id: currentMembership.workspace.id, name: currentMembership.workspace.name, slug: currentMembership.workspace.slug, role: currentMembership.role },
    ...memberships.filter((m) => m.workspaceId !== currentMembership.workspaceId).map((m) => ({ id: m.workspace.id, name: m.workspace.name, slug: m.workspace.slug, role: m.role })),
  ]

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
            <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
            <span className="text-sm font-medium">New project</span>
          </div>
        </header>
        <div className="flex flex-1 items-start justify-center overflow-y-auto">
          <NewProjectForm />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
