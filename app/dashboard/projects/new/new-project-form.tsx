"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeftIcon } from "lucide-react"
import { ProjectIcon } from "@/components/project-icon"
import { PROJECT_ICONS, type ProjectIcon as TProjectIcon } from "@/lib/validations/project"
import { createProject } from "../actions"
import { cn } from "@/lib/utils"

export function NewProjectForm() {
  const [selectedIcon, setSelectedIcon] = useState<TProjectIcon>("folder")

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await createProject(formData)
    },
    undefined,
  )

  return (
    <div className="w-full max-w-md px-8 py-10">
      <Link
        href="/dashboard"
        className="mb-10 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Dashboard
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mb-1">New project</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Give your project a name and pick an icon.
      </p>

      <form action={formAction} className="space-y-6" suppressHydrationWarning>
        {state?.error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </div>
        )}

        {/* Name field */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Name</p>
          <Input
            name="name"
            placeholder="My awesome project"
            required
            autoFocus
            suppressHydrationWarning
          />
        </div>

        {/* Icon picker */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Icon</p>
          <div className="rounded-xl border bg-muted/30 p-3">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "0.375rem",
              }}
            >
              {PROJECT_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  title={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={cn(
                    "aspect-square w-full flex items-center justify-center rounded-lg transition-all",
                    selectedIcon === icon
                      ? "bg-linear-to-br from-violet-500 to-blue-500 text-white shadow-md shadow-violet-500/25"
                      : "text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm"
                  )}
                >
                  <ProjectIcon icon={icon} className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
          <input type="hidden" name="icon" value={selectedIcon} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={pending}
            className="bg-linear-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-blue-500 border-0"
          >
            {pending ? "Creating..." : "Create project"}
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
