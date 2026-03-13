"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BellIcon, CheckCheckIcon, Trash2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { getNotifications, markAllRead, markRead, deleteNotification } from "@/app/dashboard/notifications/actions"

type Notification = {
  id: string
  title: string
  body: string
  url: string | null
  read: boolean
  createdAt: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [, startTransition] = useTransition()
  const router = useRouter()

  const unread = notifications.filter((n) => !n.read).length

  // Fetch once on mount
  useEffect(() => {
    startTransition(async () => {
      const data = await getNotifications()
      setNotifications(data)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      startTransition(async () => {
        const fresh = await getNotifications()
        setNotifications(fresh)
      })
    }
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    startTransition(() => markAllRead())
  }

  function handleClick(n: Notification) {
    if (!n.read) {
      setNotifications((prev) => prev.map((item) => item.id === n.id ? { ...item, read: true } : item))
      startTransition(() => markRead(n.id))
    }
    if (n.url) {
      setOpen(false)
      router.push(n.url)
    }
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    startTransition(() => deleteNotification(id))
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <SidebarMenuButton tooltip="Notifications">
              <div className="relative flex items-center justify-center">
                <BellIcon className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white leading-none">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
              <span>Notifications</span>
              {unread > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/10 px-1 text-[10px] font-semibold text-red-500">
                  {unread}
                </span>
              )}
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent side="right" align="end" sideOffset={8} className="w-80 p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded-md hover:bg-accent"
                >
                  <CheckCheckIcon className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              )}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex w-full gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b last:border-0 group",
                    n.read ? "" : "bg-primary/5",
                  )}
                >
                  <span className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    n.read ? "bg-transparent" : "bg-primary"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", n.read && "text-muted-foreground")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, n.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-accent transition-all shrink-0 mt-0.5"
                  >
                    <Trash2Icon className="h-3 w-3 text-muted-foreground" />
                  </button>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
