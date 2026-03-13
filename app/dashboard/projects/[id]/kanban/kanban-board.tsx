"use client"

import { useState, useTransition, useEffect, useRef, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  PlusIcon,
  Trash2Icon,
  GripVerticalIcon,
  XIcon,
  MoreHorizontalIcon,
  AlignLeftIcon,
  GripIcon,
  CheckIcon,
  CalendarIcon,
  MessageSquareIcon,
  SendIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ActivityIcon,
} from "lucide-react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  createColumn,
  deleteColumn,
  renameColumn,
  reorderColumns,
  updateColumnColor,
  createCard,
  deleteCard,
  updateCard,
  saveCardPositions,
  addComment,
  deleteComment,
} from "./actions"

// ─── Types ───────────────────────────────────────────────────

type MemberType = {
  id: string
  name: string | null
  email: string
  image: string | null
}

type CommentType = {
  id: string
  body: string
  authorId: string
  author: MemberType
  createdAt: string
}

type ActivityLogType = {
  id: string
  userId: string
  user: MemberType
  message: string
  createdAt: string
}

type CardType = {
  id: string
  title: string
  description: string | null
  order: number
  columnId: string
  dueDate: string | null
  assigneeId: string | null
  assignee: MemberType | null
  labels: string[]
  comments: CommentType[]
  activityLogs: ActivityLogType[]
}

type ColumnType = {
  id: string
  name: string
  color: string
  order: number
  cards: CardType[]
}

type ActivityFeedItem =
  | { kind: "comment"; item: CommentType }
  | { kind: "log"; item: ActivityLogType }

// ─── Label color palette (Trello-style) ──────────────────────

const LABEL_PALETTE = [
  "#4bce97", "#f5cd47", "#fea362", "#f87168",
  "#9f8fef", "#579dff", "#60c6d2", "#e774bb",
  "#1f845a", "#946f00", "#c25100", "#ca3521",
  "#6e5dc6", "#0055cc", "#1d7f8c", "#943d73",
]

// ─── Column color palette ─────────────────────────────────────

const COLUMN_COLOR_PALETTE = [
  "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b",
  "#f43f5e", "#06b6d4", "#f97316", "#d946ef",
  "#ec4899", "#14b8a6", "#a855f7", "#22c55e",
  "#64748b", "#0ea5e9", "#ef4444", "#84cc16",
]

// ─── Helpers ─────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function getInitials(user: MemberType) {
  return user.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : user.email[0].toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ─── User Avatar ─────────────────────────────────────────────

function UserAvatar({ user, className }: { user: MemberType; className?: string }) {
  return (
    <Avatar className={cn("size-7", className)}>
      {user.image && <AvatarImage src={user.image} alt={user.name ?? user.email} />}
      <AvatarFallback className="text-xs font-semibold">{getInitials(user)}</AvatarFallback>
    </Avatar>
  )
}

// ─── Date Picker ─────────────────────────────────────────────

function DatePicker({
  value,
  onChange,
}: {
  value: string // "YYYY-MM-DD" or ""
  onChange: (val: string) => void
}) {
  const [open, setOpen] = useState(false)
  const today = new Date()

  const selected = useMemo(() => {
    if (!value) return null
    const [y, m, d] = value.split("-").map(Number)
    return new Date(y, m - 1, d)
  }, [value])

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    onChange(iso)
    setOpen(false)
  }

  const isSelected = (day: number) =>
    !!selected &&
    selected.getFullYear() === viewYear &&
    selected.getMonth() === viewMonth &&
    selected.getDate() === day

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const buttonLabel = value ? formatDate(value) : "Pick a date"

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm text-left transition",
            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {buttonLabel}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-200 w-64 rounded-2xl border bg-background p-4 shadow-xl outline-none"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">{monthLabel}</span>
            <button
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-medium text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) =>
              day ? (
                <button
                  key={i}
                  onClick={() => selectDay(day)}
                  className={cn(
                    "w-full aspect-square flex items-center justify-center rounded-lg text-sm transition-colors",
                    isSelected(day) && "bg-violet-600 text-white font-semibold",
                    !isSelected(day) &&
                      isToday(day) &&
                      "border border-violet-500 text-violet-600 font-semibold",
                    !isSelected(day) && !isToday(day) && "hover:bg-muted",
                  )}
                >
                  {day}
                </button>
              ) : (
                <div key={i} />
              ),
            )}
          </div>

          {/* Clear */}
          {value && (
            <button
              onClick={() => { onChange(""); setOpen(false) }}
              className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear date
            </button>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

// ─── Card Detail Dialog ───────────────────────────────────────

function CardDetailDialog({
  card,
  columnName,
  projectId,
  members,
  currentUserId,
  currentUser,
  onClose,
  onUpdate,
  onDelete,
  onAddComment,
  onDeleteComment,
}: {
  card: CardType
  columnName: string
  projectId: string
  members: MemberType[]
  currentUserId: string
  currentUser: MemberType
  onClose: () => void
  onUpdate: (cardId: string, updates: Partial<CardType>) => void
  onDelete: (cardId: string) => void
  onAddComment: (cardId: string, body: string) => void
  onDeleteComment: (commentId: string, cardId: string) => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(card.title)
  const [descValue, setDescValue] = useState(card.description ?? "")
  const [commentText, setCommentText] = useState("")
  const [, startTransition] = useTransition()

  useEffect(() => {
    setTitleValue(card.title)
    setDescValue(card.description ?? "")
    setEditingTitle(false)
    setCommentText("")
  }, [card.id])

  function saveTitle() {
    setEditingTitle(false)
    const trimmed = titleValue.trim()
    if (!trimmed) return
    if (trimmed !== card.title) {
      onUpdate(card.id, { title: trimmed })
      startTransition(() => updateCard(card.id, projectId, { title: trimmed }))
    }
  }

  function saveDesc() {
    const trimmed = descValue.trim()
    if (trimmed !== (card.description ?? "")) {
      onUpdate(card.id, { description: trimmed || null })
      startTransition(() => updateCard(card.id, projectId, { description: trimmed || null }))
    }
  }

  function toggleLabel(color: string) {
    const current = card.labels ?? []
    const newLabels = current.includes(color)
      ? current.filter((l) => l !== color)
      : [...current, color]
    onUpdate(card.id, { labels: newLabels })
    startTransition(() => updateCard(card.id, projectId, { labels: newLabels }))
  }

  function setAssignee(userId: string | null) {
    const assignee = userId ? (members.find((m) => m.id === userId) ?? null) : null
    onUpdate(card.id, { assigneeId: userId, assignee })
    startTransition(() => updateCard(card.id, projectId, { assigneeId: userId }))
  }

  function setDueDate(dateStr: string) {
    const dueDate = dateStr || null
    onUpdate(card.id, { dueDate })
    startTransition(() =>
      updateCard(card.id, projectId, { dueDate: dueDate ? new Date(dueDate) : null }),
    )
  }

  function submitComment() {
    const text = commentText.trim()
    if (!text) return
    setCommentText("")
    onAddComment(card.id, text)
  }

  const isOverdue = card.dueDate ? new Date(card.dueDate) < new Date() : false
  const dueDateInputValue = card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : ""

  // Merge comments + activity logs, sorted by createdAt
  const activityFeed = useMemo<ActivityFeedItem[]>(() => {
    const items: ActivityFeedItem[] = [
      ...(card.comments ?? []).map((c): ActivityFeedItem => ({ kind: "comment", item: c })),
      ...(card.activityLogs ?? []).map((l): ActivityFeedItem => ({ kind: "log", item: l })),
    ]
    return items.sort(
      (a, b) => new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime(),
    )
  }, [card.comments, card.activityLogs])

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-5xl sm:max-w-5xl p-0 overflow-hidden max-h-[92vh] flex flex-col gap-0 rounded-2xl">
        <VisuallyHidden>
          <DialogTitle>{card.title}</DialogTitle>
        </VisuallyHidden>

        {/* Gradient top bar */}
        <div className="h-1 w-full bg-linear-to-r from-violet-500 via-blue-500 to-cyan-400 shrink-0" />

        {/* Header: labels + title + column badge */}
        <div className="px-9 pt-8 pb-5 shrink-0 border-b">
          {(card.labels?.length ?? 0) > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {card.labels.map((color) => (
                <button
                  key={color}
                  onClick={() => toggleLabel(color)}
                  title="Click to remove"
                  className="h-6 w-16 rounded-full transition-opacity hover:opacity-70"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}

          {editingTitle ? (
            <textarea
              autoFocus
              rows={2}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveTitle() }
                if (e.key === "Escape") { setTitleValue(card.title); setEditingTitle(false) }
              }}
              className="w-full resize-none rounded-xl border-2 border-violet-500/30 bg-muted/40 px-3 py-2.5 text-2xl font-bold outline-none focus:border-violet-500/60"
            />
          ) : (
            <h2
              className="cursor-text rounded-xl px-1 -mx-1 py-1 text-2xl font-bold leading-tight hover:bg-muted/50 transition-colors"
              onClick={() => setEditingTitle(true)}
            >
              {card.title}
            </h2>
          )}

          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>In</span>
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              {columnName}
            </span>
          </div>
        </div>

        {/* Body: left scrollable + right sidebar */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left: description + activity */}
          <div className="flex-1 min-w-0 overflow-y-auto p-9 pt-7 space-y-8">

            {/* Description */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <AlignLeftIcon className="h-3.5 w-3.5" />
                Description
              </div>
              <textarea
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                onBlur={saveDesc}
                rows={4}
                placeholder="Add a more detailed description…"
                className="w-full resize-none rounded-xl border bg-muted/20 px-4 py-3.5 text-sm leading-relaxed outline-none transition focus:bg-background focus:ring-2 focus:ring-violet-500/30 placeholder:text-muted-foreground/40"
              />
            </div>

            {/* Activity */}
            <div className="space-y-5 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ActivityIcon className="h-3.5 w-3.5" />
                Activity
              </div>

              {/* Comment input */}
              <div className="flex gap-4">
                <UserAvatar user={currentUser} className="mt-1 size-9 shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <textarea
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment() }
                    }}
                    placeholder="Write a comment…"
                    className="w-full resize-none rounded-xl border bg-muted/20 px-4 py-3 text-sm outline-none transition focus:bg-background focus:ring-2 focus:ring-violet-500/30 placeholder:text-muted-foreground/40"
                  />
                  {commentText.trim() && (
                    <Button
                      size="sm"
                      className="h-8 bg-violet-600 hover:bg-violet-500 text-white text-xs px-4 border-0 rounded-lg"
                      onClick={submitComment}
                    >
                      <SendIcon className="h-3.5 w-3.5 mr-1.5" />
                      Send
                    </Button>
                  )}
                </div>
              </div>

              {/* Feed */}
              {activityFeed.length > 0 && (
                <div className="space-y-4">
                  {activityFeed.map((entry) => {
                    if (entry.kind === "comment") {
                      const comment = entry.item
                      return (
                        <div key={comment.id} className="flex gap-4 group/comment">
                          <UserAvatar user={comment.author} className="mt-0.5 size-9 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1.5">
                              <span className="text-sm font-semibold">
                                {comment.author.name ?? comment.author.email}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {timeAgo(comment.createdAt)}
                              </span>
                            </div>
                            <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm leading-relaxed">
                              {comment.body}
                            </div>
                            {comment.authorId === currentUserId && (
                              <button
                                onClick={() => onDeleteComment(comment.id, card.id)}
                                className="mt-1 text-xs text-muted-foreground/40 hover:text-destructive opacity-0 group-hover/comment:opacity-100 transition-all"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    }

                    const log = entry.item
                    return (
                      <div key={log.id} className="flex items-center gap-3 text-sm">
                        <UserAvatar user={log.user} className="size-7 shrink-0" />
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {log.user.name ?? log.user.email}
                          </span>{" "}
                          {log.message}
                        </span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground/50">
                          {timeAgo(log.createdAt)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-60 shrink-0 overflow-y-auto border-l bg-muted/20 p-6 space-y-7">

            {/* Labels */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Labels
              </p>
              <div className="grid grid-cols-8 gap-2">
                {LABEL_PALETTE.map((color) => {
                  const active = card.labels?.includes(color) ?? false
                  return (
                    <button
                      key={color}
                      onClick={() => toggleLabel(color)}
                      title={active ? "Remove label" : "Add label"}
                      className="relative h-7 w-7 rounded-full transition-all hover:scale-110 hover:shadow-md focus:outline-none"
                      style={{ backgroundColor: color }}
                    >
                      {active && (
                        <CheckIcon className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Assignee */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Assignee
              </p>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => {
                  const isAssigned = card.assigneeId === member.id
                  return (
                    <button
                      key={member.id}
                      onClick={() => setAssignee(isAssigned ? null : member.id)}
                      title={member.name ?? member.email}
                      className={cn(
                        "relative rounded-full transition-all hover:scale-110",
                        isAssigned && "ring-2 ring-violet-500 ring-offset-2",
                      )}
                    >
                      <UserAvatar user={member} className="size-9" />
                      {isAssigned && (
                        <span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-500">
                          <CheckIcon className="h-2 w-2 text-white" />
                        </span>
                      )}
                    </button>
                  )
                })}
                {members.length === 0 && (
                  <p className="text-xs text-muted-foreground/60">No workspace members</p>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Due Date
              </p>
              <DatePicker value={dueDateInputValue} onChange={setDueDate} />
              {card.dueDate && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    isOverdue ? "text-red-500" : "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="h-3 w-3" />
                  {isOverdue ? "Overdue · " : ""}{formatDate(card.dueDate)}
                </span>
              )}
            </div>

            {/* Divider + Delete */}
            <div className="border-t pt-5">
              <button
                onClick={() => { onDelete(card.id); onClose() }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2Icon className="h-4 w-4" />
                Delete card
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Kanban Card ──────────────────────────────────────────────

function KanbanCard({
  card,
  onOpen,
  onQuickComplete,
  overlay = false,
  disableDrag = false,
}: {
  card: CardType
  onOpen?: () => void
  onQuickComplete?: () => void
  overlay?: boolean
  disableDrag?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
    disabled: disableDrag,
  })

  const style = { transform: CSS.Transform.toString(transform), transition }
  const isOverdue = card.dueDate ? new Date(card.dueDate) < new Date() : false

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-40",
        overlay && "rotate-2 shadow-2xl ring-2 ring-violet-500/40",
      )}
    >
      {/* Grip handle */}
      <button
        {...attributes}
        {...listeners}
        suppressHydrationWarning
        onClick={(e) => e.stopPropagation()}
        className="absolute left-2.5 top-4 cursor-grab text-transparent group-hover:text-muted-foreground/40 hover:text-muted-foreground! active:cursor-grabbing transition-colors"
      >
        <GripVerticalIcon className="h-3.5 w-3.5" />
      </button>

      {/* Quick complete */}
      {onQuickComplete && (
        <button
          onClick={(e) => { e.stopPropagation(); onQuickComplete() }}
          className="absolute right-2.5 top-3.5 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded-full border-2 border-muted-foreground/30 hover:border-green-500 hover:bg-green-500/10 flex items-center justify-center"
          title="Mark complete"
        >
          <CheckIcon className="h-3 w-3 text-muted-foreground/50 hover:text-green-500" />
        </button>
      )}

      <button
        className="w-full text-left pl-8 pr-4 pt-4 pb-3.5"
        onClick={onOpen}
      >
        {/* Label strips */}
        {(card.labels?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {card.labels.map((labelColor) => (
              <span
                key={labelColor}
                className="h-1.5 w-10 rounded-full"
                style={{ backgroundColor: labelColor }}
              />
            ))}
          </div>
        )}

        <p className="text-sm font-medium leading-snug">{card.title}</p>

        {card.description && (
          <p className="mt-1.5 text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">
            {card.description}
          </p>
        )}

        {/* Footer */}
        {(card.dueDate || (card.comments?.length ?? 0) > 0 || card.assignee) && (
          <div className="mt-3 flex items-center gap-2">
            {card.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  isOverdue
                    ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {formatDate(card.dueDate)}
              </span>
            )}
            {(card.comments?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                <MessageSquareIcon className="h-3 w-3" />
                {card.comments.length}
              </span>
            )}
            {card.assignee && (
              <div className="ml-auto">
                <UserAvatar user={card.assignee} className="size-6" />
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  )
}

// ─── Add Card Form ────────────────────────────────────────────

function AddCardForm({
  columnId,
  projectId,
  onDone,
}: {
  columnId: string
  projectId: string
  onDone: () => void
}) {
  const [value, setValue] = useState("")
  const [, startTransition] = useTransition()

  function submit() {
    const title = value.trim()
    if (!title) { onDone(); return }
    startTransition(async () => {
      await createCard(columnId, projectId, title)
      onDone()
    })
  }

  return (
    <div className="space-y-1.5">
      <textarea
        autoFocus
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() }
          if (e.key === "Escape") onDone()
        }}
        placeholder="Card title…"
        className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-violet-500/30"
      />
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          className="h-7 bg-violet-600 text-white hover:bg-violet-500 border-0 text-xs px-3 rounded-lg"
          onClick={submit}
        >
          Add card
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={onDone}>
          <XIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────

function KanbanColumn({
  column,
  projectId,
  onOpenCard,
  onColorChange,
  onQuickComplete,
  activeCardId,
}: {
  column: ColumnType
  projectId: string
  onOpenCard: (card: CardType) => void
  onColorChange: (columnId: string, color: string) => void
  onQuickComplete: (card: CardType) => void
  activeCardId: string | null
}) {
  const [addingCard, setAddingCard] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(column.name)
  const [, startTransition] = useTransition()

  function changeColor(color: string) {
    onColorChange(column.id, color)
    startTransition(() => updateColumnColor(column.id, projectId, color))
  }

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column", column },
    disabled: !!activeCardId,
  })

  const style = { transform: CSS.Transform.toString(transform), transition }
  const cardIds = column.cards.map((c) => c.id)

  function submitRename() {
    const name = nameValue.trim()
    if (name && name !== column.name) {
      startTransition(() => renameColumn(column.id, projectId, name))
    } else {
      setNameValue(column.name)
    }
    setEditingName(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-80 shrink-0 flex-col rounded-2xl border bg-card overflow-hidden",
        isDragging && "opacity-50 shadow-xl",
      )}
    >
      {/* Colored top bar */}
      <div style={{ backgroundColor: column.color, height: "3px" }} />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5">
        <button
          {...attributes}
          {...listeners}
          suppressHydrationWarning
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 cursor-grab text-muted-foreground/20 hover:text-muted-foreground/60 active:cursor-grabbing transition-colors"
        >
          <GripIcon className="h-3.5 w-3.5" />
        </button>

        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename()
              if (e.key === "Escape") { setNameValue(column.name); setEditingName(false) }
            }}
            className="flex-1 min-w-0 rounded-lg border bg-background px-2 py-0.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        ) : (
          <span
            onDoubleClick={() => setEditingName(true)}
            className="flex-1 min-w-0 truncate text-sm font-semibold cursor-default select-none"
          >
            {column.name}
          </span>
        )}

        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {column.cards.length}
        </span>

        <button
          onClick={() => setAddingCard(true)}
          className="shrink-0 text-muted-foreground/40 hover:text-foreground transition-colors"
          title="Add card"
        >
          <PlusIcon className="h-4 w-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0 text-muted-foreground/40 hover:text-foreground transition-colors">
              <MoreHorizontalIcon className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setEditingName(true)}>
              <CheckIcon className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Color
              </p>
              <div className="grid grid-cols-8 gap-1.5">
                {COLUMN_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => changeColor(c)}
                    className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{ backgroundColor: c }}
                    title={c}
                  >
                    {column.color === c && (
                      <CheckIcon className="h-3 w-3 text-white m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => startTransition(() => deleteColumn(column.id, projectId))}
            >
              <Trash2Icon className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 px-3 pb-3">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {column.cards.length === 0 && !addingCard && (
            <div className="rounded-xl border-2 border-dashed py-8 text-center text-xs text-muted-foreground/30 select-none">
              Drop cards here
            </div>
          )}
          {column.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onOpen={() => onOpenCard(card)}
              onQuickComplete={() => onQuickComplete(card)}
              disableDrag={false}
            />
          ))}
        </SortableContext>

        {addingCard ? (
          <AddCardForm
            columnId={column.id}
            projectId={projectId}
            onDone={() => setAddingCard(false)}
          />
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add a card
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Add Column Button ────────────────────────────────────────

function AddColumnButton({ projectId }: { projectId: string }) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState("")
  const [, startTransition] = useTransition()

  function submit() {
    const name = value.trim()
    if (!name) { setAdding(false); return }
    startTransition(async () => {
      await createColumn(projectId, name)
      setValue("")
      setAdding(false)
    })
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex h-11 w-80 shrink-0 items-center gap-2 rounded-2xl border-2 border-dashed px-4 text-sm text-muted-foreground/50 hover:border-violet-400/50 hover:text-violet-500 transition-colors"
      >
        <PlusIcon className="h-4 w-4" />
        Add column
      </button>
    )
  }

  return (
    <div className="flex w-80 shrink-0 flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
          if (e.key === "Escape") setAdding(false)
        }}
        placeholder="Column name…"
        className="rounded-xl border bg-muted/50 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
      />
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          className="h-7 bg-violet-600 text-white hover:bg-violet-500 border-0 text-xs px-3 rounded-lg"
          onClick={submit}
        >
          Add column
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => setAdding(false)}>
          <XIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Board ────────────────────────────────────────────────────

export function KanbanBoard({
  projectId,
  initialColumns,
  members,
  currentUserId,
  currentUser,
}: {
  projectId: string
  initialColumns: ColumnType[]
  members: MemberType[]
  currentUserId: string
  currentUser: MemberType
}) {
  const [columns, setColumns] = useState<ColumnType[]>(initialColumns)
  const [activeCard, setActiveCard] = useState<CardType | null>(null)
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null)
  const [detailCardId, setDetailCardId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const columnsRef = useRef(columns)
  useEffect(() => { columnsRef.current = columns }, [columns])

  useEffect(() => {
    if (!activeCard && !activeColumn) setColumns(initialColumns)
  }, [initialColumns])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const columnIds = columns.map((c) => c.id)

  const detailCard = detailCardId
    ? columns.flatMap((c) => c.cards).find((c) => c.id === detailCardId) ?? null
    : null
  const detailColumnName = detailCard
    ? (columns.find((c) => c.id === detailCard.columnId)?.name ?? "")
    : ""

  function findColumnOfCard(cardId: string) {
    return columns.find((col) => col.cards.some((c) => c.id === cardId))
  }

  function onDragStart({ active }: DragStartEvent) {
    const data = active.data.current
    if (data?.type === "card") setActiveCard(data.card)
    else if (data?.type === "column") setActiveColumn(data.column)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return
    if (active.data.current?.type !== "card") return

    const activeCol = findColumnOfCard(active.id as string)
    const overCol =
      columns.find((c) => c.id === over.id) ?? findColumnOfCard(over.id as string)

    if (!activeCol || !overCol || activeCol.id === overCol.id) return

    setColumns((prev) => {
      const card = activeCol.cards.find((c) => c.id === active.id)!
      return prev.map((col) => {
        if (col.id === activeCol.id) return { ...col, cards: col.cards.filter((c) => c.id !== active.id) }
        if (col.id === overCol.id) {
          const overIndex = col.cards.findIndex((c) => c.id === over.id)
          const insertAt = overIndex >= 0 ? overIndex : col.cards.length
          const newCards = [...col.cards]
          newCards.splice(insertAt, 0, { ...card, columnId: col.id })
          return { ...col, cards: newCards }
        }
        return col
      })
    })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveCard(null)
    setActiveColumn(null)
    if (!over) return

    const activeData = active.data.current

    if (activeData?.type === "column") {
      const oldIndex = columns.findIndex((c) => c.id === active.id)
      const newIndex = columns.findIndex((c) => c.id === over.id)
      if (oldIndex !== newIndex) {
        const newCols = arrayMove(columns, oldIndex, newIndex)
        setColumns(newCols)
        startTransition(() =>
          reorderColumns(projectId, newCols.map((c, i) => ({ id: c.id, order: i }))),
        )
      }
      return
    }

    if (activeData?.type === "card") {
      const latestCols = columnsRef.current
      const destCol = latestCols.find((col) => col.cards.some((c) => c.id === active.id))
      if (!destCol) return

      const oldIndex = destCol.cards.findIndex((c) => c.id === active.id)
      const newIndex = destCol.cards.findIndex((c) => c.id === over.id)

      let finalCols = latestCols
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(destCol.cards, oldIndex, newIndex)
        finalCols = latestCols.map((c) => (c.id === destCol.id ? { ...c, cards: reordered } : c))
        setColumns(finalCols)
      }

      const allCards = finalCols.flatMap((c) =>
        c.cards.map((card, i) => ({ id: card.id, columnId: c.id, order: i })),
      )
      startTransition(() => saveCardPositions(projectId, allCards))
    }
  }

  function handleQuickComplete(card: CardType) {
    const lastCol = columns[columns.length - 1]
    if (!lastCol || card.columnId === lastCol.id) return
    const order = lastCol.cards.length
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === card.columnId) return { ...col, cards: col.cards.filter((c) => c.id !== card.id) }
        if (col.id === lastCol.id) return { ...col, cards: [...col.cards, { ...card, columnId: lastCol.id, order }] }
        return col
      }),
    )
    startTransition(() =>
      saveCardPositions(projectId, [{ id: card.id, columnId: lastCol.id, order }]),
    )
  }

  function handleColumnColorChange(columnId: string, color: string) {
    setColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, color } : col)),
    )
  }

  function handleCardUpdate(cardId: string, updates: Partial<CardType>) {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((card) => (card.id === cardId ? { ...card, ...updates } : card)),
      })),
    )
  }

  function handleCardDelete(cardId: string) {
    startTransition(() => deleteCard(cardId, projectId))
    setColumns((prev) =>
      prev.map((col) => ({ ...col, cards: col.cards.filter((c) => c.id !== cardId) })),
    )
  }

  function handleAddComment(cardId: string, body: string) {
    const optimistic: CommentType = {
      id: `temp-${Date.now()}`,
      body,
      authorId: currentUserId,
      author: currentUser,
      createdAt: new Date().toISOString(),
    }
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((card) =>
          card.id === cardId
            ? { ...card, comments: [...(card.comments ?? []), optimistic] }
            : card,
        ),
      })),
    )
    startTransition(() => addComment(cardId, projectId, body))
  }

  function handleDeleteComment(commentId: string, cardId: string) {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((card) =>
          card.id === cardId
            ? { ...card, comments: card.comments.filter((c) => c.id !== commentId) }
            : card,
        ),
      })),
    )
    startTransition(() => deleteComment(commentId, projectId))
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-6 p-8 overflow-x-auto h-full items-start">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {columns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                projectId={projectId}
                activeCardId={activeCard?.id ?? null}
                onOpenCard={(card) => setDetailCardId(card.id)}
                onColorChange={handleColumnColorChange}
                onQuickComplete={handleQuickComplete}
              />
            ))}
          </SortableContext>
          <AddColumnButton projectId={projectId} />
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeCard && <KanbanCard card={activeCard} overlay />}
          {activeColumn && (
            <div className="w-72 rounded-2xl border bg-card shadow-2xl overflow-hidden opacity-95">
              <div
                style={{
                  backgroundColor: activeColumn.color,
                  height: "3px",
                }}
              />
              <div className="px-4 py-3">
                <p className="text-sm font-semibold">{activeColumn.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeColumn.cards.length} cards
                </p>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {detailCard && (
        <CardDetailDialog
          card={detailCard}
          columnName={detailColumnName}
          projectId={projectId}
          members={members}
          currentUserId={currentUserId}
          currentUser={currentUser}
          onClose={() => setDetailCardId(null)}
          onUpdate={handleCardUpdate}
          onDelete={handleCardDelete}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
        />
      )}
    </>
  )
}
