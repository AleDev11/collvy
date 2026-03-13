"use client"

import * as React from "react"
import { LayoutDashboardIcon, KanbanIcon, FileTextIcon, CalendarIcon, Settings2Icon, SearchIcon } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { GlobalSearch } from "@/components/global-search"
import { NotificationBell } from "@/components/notification-bell"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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

function openSearch() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))
}

function SearchButton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={openSearch} tooltip="Search (⌘K)">
          <SearchIcon />
          <span className="flex-1">Search</span>
          <span className="text-[10px] text-muted-foreground font-mono">⌘K</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
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
    <>
      <GlobalSearch />
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <WorkspaceSwitcher workspaces={workspaces} />
          <SearchButton />
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={navMain} />
          <NavProjects projects={projects} />
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-end px-2 pb-1">
            <NotificationBell />
          </div>
          <NavUser user={user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  )
}
