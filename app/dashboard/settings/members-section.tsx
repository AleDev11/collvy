"use client"

import { useState, useTransition } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { MoreHorizontalIcon, ShieldIcon, UserIcon, LogOutIcon, UserXIcon } from "lucide-react"
import { updateMemberRole, removeMember, leaveWorkspace } from "./actions"
import { cn } from "@/lib/utils"

interface Member {
  id: string
  userId: string
  name: string
  email: string
  image: string | null
  role: string
  isCurrentUser: boolean
}

interface Props {
  workspaceId: string
  members: Member[]
  currentUserRole: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
}

const ROLE_STYLES: Record<string, string> = {
  owner: "bg-primary/10 text-primary",
  admin: "bg-amber-500/10 text-amber-600",
  member: "bg-muted text-muted-foreground",
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function MemberRow({
  member,
  workspaceId,
  currentUserRole,
}: {
  member: Member
  workspaceId: string
  currentUserRole: string
}) {
  const [pending, startTransition] = useTransition()
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const canManage = currentUserRole === "owner" && !member.isCurrentUser && member.role !== "owner"
  const canRemove =
    (currentUserRole === "owner" && member.role !== "owner" && !member.isCurrentUser) ||
    (currentUserRole === "admin" && member.role === "member" && !member.isCurrentUser)
  const canLeave = member.isCurrentUser && member.role !== "owner"

  function handleRoleChange(role: string) {
    startTransition(async () => {
      await updateMemberRole(member.id, workspaceId, role)
    })
  }

  function handleRemove() {
    startTransition(async () => {
      await removeMember(member.id, workspaceId)
      setConfirmRemove(false)
    })
  }

  function handleLeave() {
    startTransition(async () => {
      await leaveWorkspace(workspaceId)
    })
  }

  const showMenu = canManage || canRemove || canLeave

  return (
    <div className={cn("flex items-center gap-3 py-3", pending && "opacity-50 pointer-events-none")}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={member.image ?? undefined} alt={member.name} />
        <AvatarFallback className="text-xs">{getInitials(member.name)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {member.name}
          {member.isCurrentUser && (
            <span className="ml-1.5 text-xs text-muted-foreground font-normal">(you)</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>

      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
          ROLE_STYLES[member.role] ?? ROLE_STYLES.member,
        )}
      >
        {ROLE_LABELS[member.role] ?? member.role}
      </span>

      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {canManage && (
              <>
                {member.role !== "admin" && (
                  <DropdownMenuItem onClick={() => handleRoleChange("admin")}>
                    <ShieldIcon className="h-4 w-4 mr-2" />
                    Make admin
                  </DropdownMenuItem>
                )}
                {member.role !== "member" && (
                  <DropdownMenuItem onClick={() => handleRoleChange("member")}>
                    <UserIcon className="h-4 w-4 mr-2" />
                    Make member
                  </DropdownMenuItem>
                )}
                {canRemove && <DropdownMenuSeparator />}
              </>
            )}
            {canRemove && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmRemove(true)}
              >
                <UserXIcon className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            )}
            {canLeave && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmLeave(true)}
              >
                <LogOutIcon className="h-4 w-4 mr-2" />
                Leave workspace
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove member"
        description={`Remove ${member.name} from the workspace? They will lose access immediately.`}
        confirmLabel="Remove"
        onConfirm={handleRemove}
        loading={pending}
      />
      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave workspace"
        description="You will lose access to this workspace immediately."
        confirmLabel="Leave"
        onConfirm={handleLeave}
        loading={pending}
      />
    </div>
  )
}

export function MembersSection({ workspaceId, members, currentUserRole }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Members</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
      </div>

      <div className="divide-y">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            workspaceId={workspaceId}
            currentUserRole={currentUserRole}
          />
        ))}
      </div>
    </div>
  )
}
