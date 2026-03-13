"use client"

import { useActionState, useTransition, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CopyIcon, RefreshCwIcon, CheckIcon, Settings2Icon, LinkIcon } from "lucide-react"
import { updateWorkspaceName, regenerateInviteCode } from "./actions"
import { ConfirmDialog } from "@/components/confirm-dialog"

interface Props {
  workspaceId: string
  workspaceName: string
  inviteCode: string
  currentUserRole: string
}

export function GeneralSection({ workspaceId, workspaceName, inviteCode, currentUserRole }: Props) {
  const canEdit = ["owner", "admin"].includes(currentUserRole)

  const [nameState, nameAction, namePending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | undefined, formData: FormData) => {
      return await updateWorkspaceName(workspaceId, formData)
    },
    undefined,
  )

  const [copied, setCopied] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [regenPending, startRegen] = useTransition()

  function handleCopy() {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRegenerate() {
    startRegen(async () => {
      await regenerateInviteCode(workspaceId)
      setConfirmOpen(false)
    })
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
          <Settings2Icon className="h-4 w-4 text-violet-500" />
        </div>
        <h2 className="text-base font-semibold">General</h2>
      </div>

      {/* Workspace name card */}
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-medium">Workspace name</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">The display name for your workspace.</p>
        <form action={nameAction} className="flex items-start gap-3">
          <div className="flex-1 space-y-1.5">
            <Input
              name="name"
              defaultValue={workspaceName}
              disabled={!canEdit}
              maxLength={50}
            />
            {nameState?.error && (
              <p className="text-xs text-destructive">{nameState.error}</p>
            )}
            {nameState?.success && (
              <p className="text-xs text-emerald-600">Saved</p>
            )}
          </div>
          {canEdit && (
            <Button type="submit" size="sm" disabled={namePending} className="shrink-0">
              {namePending ? "Saving..." : "Save"}
            </Button>
          )}
        </form>
      </div>

      {/* Invite code card */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-0.5">
          <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-sm font-medium">Invite code</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Share this code with teammates so they can join your workspace.
        </p>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={inviteCode}
            className="font-mono text-sm bg-muted/50"
          />
          <Button variant="outline" size="icon" onClick={handleCopy} title="Copy code" className="shrink-0">
            {copied ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <CopyIcon className="h-4 w-4" />}
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setConfirmOpen(true)}
              title="Regenerate code"
              className="shrink-0"
            >
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Regenerate invite code"
        description="The current invite code will stop working immediately. Anyone with the old link won't be able to join."
        confirmLabel="Regenerate"
        onConfirm={handleRegenerate}
        loading={regenPending}
      />
    </div>
  )
}
