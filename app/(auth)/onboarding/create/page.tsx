"use client"

import { useState, useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { createWorkspace } from "./actions"

export default function CreateWorkspacePage() {
  const [name, setName] = useState("")

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await createWorkspace(formData)
    },
    undefined,
  )

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 32)

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
        <CardTitle className="text-2xl font-bold">Create a workspace</CardTitle>
        <CardDescription>Set up a workspace for your team or company</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Acme Inc."
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL slug</Label>
            <div className="flex items-center gap-0 rounded-lg border">
              <span className="shrink-0 pl-3 text-sm text-muted-foreground">collvy.app/</span>
              <Input
                id="slug"
                name="slug"
                placeholder="acme-inc"
                required
                value={slug}
                onChange={(e) => setName(e.target.value)}
                className="border-0 pl-0 focus-visible:ring-0"
              />
            </div>
            <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, and dashes</p>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating..." : "Create workspace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
