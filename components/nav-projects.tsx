"use client"

import { useState, useTransition } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { MoreHorizontalIcon, FolderIcon, Trash2Icon, PlusIcon } from "lucide-react"
import { deleteProject } from "@/app/dashboard/projects/actions"
import { ProjectIcon } from "@/components/project-icon"
import { ConfirmDialog } from "@/components/confirm-dialog"
import type { SidebarProject } from "@/components/app-sidebar"

export function NavProjects({ projects }: { projects: SidebarProject[] }) {
  const { isMobile } = useSidebar()
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleConfirmDelete() {
    if (!deletingId) return
    startTransition(() => { deleteProject(deletingId) })
    setDeletingId(null)
  }

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarMenu>
          {projects.map((project) => (
            <SidebarMenuItem key={project.id}>
              <SidebarMenuButton asChild>
                <a href={`/dashboard/projects/${project.id}`}>
                  <ProjectIcon icon={project.icon} className="h-4 w-4 shrink-0" />
                  <span>{project.name}</span>
                </a>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover className="aria-expanded:bg-muted">
                    <MoreHorizontalIcon />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem asChild>
                    <a href={`/dashboard/projects/${project.id}`}>
                      <FolderIcon className="text-muted-foreground" />
                      <span>View Project</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeletingId(project.id)}
                  >
                    <Trash2Icon />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-sidebar-foreground/70">
              <a href="/dashboard/projects/new">
                <PlusIcon className="text-sidebar-foreground/70" />
                <span>New project</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null) }}
        title="Delete project"
        description="This will permanently delete the project and all its content. This action cannot be undone."
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
