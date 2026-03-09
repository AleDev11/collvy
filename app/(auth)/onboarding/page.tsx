import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, UserPlus } from "lucide-react"

export default async function OnboardingPage() {
  const session = await requireAuth()

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
  })

  if (membership) redirect("/dashboard")

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Welcome to collvy</CardTitle>
        <CardDescription>Create a workspace for your team or join an existing one</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button variant="outline" className="h-auto justify-start gap-4 p-4" asChild>
          <Link href="/onboarding/create">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">Create a workspace</div>
              <div className="text-sm text-muted-foreground">Set up a new workspace for your team</div>
            </div>
          </Link>
        </Button>

        <Button variant="outline" className="h-auto justify-start gap-4 p-4" asChild>
          <Link href="/onboarding/join">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">Join a workspace</div>
              <div className="text-sm text-muted-foreground">Enter an invite code to join your team</div>
            </div>
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
