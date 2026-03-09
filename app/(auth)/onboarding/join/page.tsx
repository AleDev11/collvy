"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { joinWorkspace } from "./actions"

export default function JoinWorkspacePage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await joinWorkspace(formData)
    },
    undefined,
  )

  return (
    <Card>
      <CardHeader>
        <Link
          href="/onboarding"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <CardTitle className="text-2xl font-bold">Join a workspace</CardTitle>
        <CardDescription>Enter the invite code shared by your team</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">Invite code</Label>
            <Input id="code" name="code" placeholder="Paste your invite code" required />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Joining..." : "Join workspace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
