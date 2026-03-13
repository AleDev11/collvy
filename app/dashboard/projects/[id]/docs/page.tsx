import { notFound, redirect } from "next/navigation"
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
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { FileTextIcon } from "lucide-react"
import { createDoc } from "./actions"

export default async function DocsIndexPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requireAuth()

  const [project, memberships] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: { where: { userId: session.user.id } } } } },
    }),
    db.workspaceMember.findMany({
      where: { userId: session.user.id },
      include: { workspace: { include: { projects: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ])

  if (!project || project.workspace.members.length === 0) notFound()

  const firstDoc = await db.doc.findFirst({
    where: { projectId: id, parentId: null },
    orderBy: { order: "asc" },
  })
  if (firstDoc) redirect(`/dashboard/projects/${id}/docs/${firstDoc.id}`)

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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={`/dashboard/projects/${id}`}>
                    {project.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Docs</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 mx-auto">
              <FileTextIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No documents yet</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first document to get started
              </p>
            </div>
            <form
              action={async () => {
                "use server"
                await createDoc(id, null)
              }}
            >
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white border-0"
              >
                Create first document
              </Button>
            </form>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
