import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"

export default async function DashboardPage() {
  const session = await requireAuth()

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
  })

  if (!membership) redirect("/onboarding")

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{membership.workspace.name}</h1>
        <p className="mt-2 text-muted-foreground">
          Dashboard coming soon. Workspace slug: <code>{membership.workspace.slug}</code>
        </p>
      </div>
    </div>
  )
}
