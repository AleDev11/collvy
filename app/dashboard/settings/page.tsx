import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
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
import { GeneralSection } from "./general-section"
import { MembersSectionClient } from "./members-section-client"

export default async function SettingsPage() {
  const session = await requireAuth()

  const memberships = await db.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: {
      workspace: {
        include: {
          projects: true,
          members: {
            include: { user: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  if (memberships.length === 0) redirect("/onboarding")

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
    ...memberships.filter((m) => m.workspaceId !== currentMembership.workspaceId).map((m) => ({ id: m.workspace.id, name: m.workspace.name, slug: m.workspace.slug, role: m.role })),
  ]

  const projects = workspace.projects.map((p) => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
  }))

  const members = workspace.members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name ?? m.user.email ?? "User",
    email: m.user.email ?? "",
    image: m.user.image ?? null,
    role: m.role,
    isCurrentUser: m.userId === session.user.id,
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
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-8 p-6 max-w-2xl w-full mx-auto">
          <div>
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">{workspace.name}</p>
          </div>
          <GeneralSection
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            inviteCode={workspace.inviteCode}
            currentUserRole={currentMembership.role}
          />
          <MembersSectionClient
            workspaceId={workspace.id}
            members={members}
            currentUserRole={currentMembership.role}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
