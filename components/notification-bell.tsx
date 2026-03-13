"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BellIcon, CheckCheckIcon, Trash2Icon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
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

  // Refresh when opening
  function handleOpen() {
    setOpen(true)
    startTransition(async () => {
      const fresh = await getNotifications()
      setNotifications(fresh)
    })
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("[data-notification-panel]")) setOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [open])

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
    <div className="relative" data-notification-panel>
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="relative flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border bg-popover shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded-md hover:bg-accent"
                  title="Mark all as read"
                >
                  <CheckCheckIcon className="h-3.5 w-3.5" />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-accent transition-colors"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
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
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", n.read && "text-muted-foreground")}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, n.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-accent transition-all shrink-0 mt-0.5"
                >
                  <Trash2Icon className="h-3 w-3 text-muted-foreground" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
