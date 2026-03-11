"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Trash2Icon } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { deleteProject } from "../actions"

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(() => { deleteProject(projectId) })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon className="h-4 w-4" />
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete project"
        description="This will permanently delete the project and all its content. This action cannot be undone."
        onConfirm={handleConfirm}
        loading={pending}
      />
    </>
  )
}
