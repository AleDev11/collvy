"use client"

import * as React from "react"
import { LayoutDashboardIcon, KanbanIcon, FileTextIcon, CalendarIcon, Settings2Icon } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const navMain = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: <LayoutDashboardIcon />,
  },
  {
    title: "Kanban",
    url: "/dashboard/kanban",
    icon: <KanbanIcon />,
  },
  {
    title: "Docs",
    url: "/dashboard/docs",
    icon: <FileTextIcon />,
  },
  {
    title: "Planner",
    url: "/dashboard/planner",
    icon: <CalendarIcon />,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: <Settings2Icon />,
  },
]

export type SidebarWorkspace = {
  id: string
  name: string
  slug: string
  role: string
}

export type SidebarProject = {
  id: string
  name: string
  icon: string
}

export type SidebarUser = {
  name: string
  email: string
  image: string | null
}

export function AppSidebar({
  user,
  workspaces,
  projects,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: SidebarUser
  workspaces: SidebarWorkspace[]
  projects: SidebarProject[]
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher workspaces={workspaces} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
