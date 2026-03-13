import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"

export default async function GlobalDocsPage() {
  const session = await requireAuth()

  // Find first project the user is member of
  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      workspace: {
        include: { projects: { orderBy: { createdAt: "asc" }, take: 1 } },
      },
    },
  })

  const firstProject = membership?.workspace.projects[0]
  if (firstProject) redirect(`/dashboard/projects/${firstProject.id}/docs`)

  redirect("/dashboard")
}
