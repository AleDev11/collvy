"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { PencilIcon } from "lucide-react"
import { ProjectIcon } from "@/components/project-icon"
import { PROJECT_ICONS, type ProjectIcon as TProjectIcon } from "@/lib/validations/project"
import { updateProject } from "../actions"
import { cn } from "@/lib/utils"

interface EditProjectButtonProps {
  projectId: string
  currentName: string
  currentIcon: string
}

export function EditProjectButton({ projectId, currentName, currentIcon }: EditProjectButtonProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(currentName)
  const [selectedIcon, setSelectedIcon] = useState<TProjectIcon>(currentIcon as TProjectIcon)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpen() {
    setName(currentName)
    setSelectedIcon(currentIcon as TProjectIcon)
    setError(null)
    setOpen(true)
  }

  function handleSave() {
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await updateProject(projectId, name.trim(), selectedIcon)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={handleOpen}
      >
        <PencilIcon className="h-4 w-4" />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Name</p>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
              />
            </div>

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
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={pending || !name.trim()}>
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
