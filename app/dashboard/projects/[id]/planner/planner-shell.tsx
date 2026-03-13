"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
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
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  PlusIcon, MoreHorizontalIcon, XIcon, Trash2Icon, CheckIcon,
  CalendarIcon, FlagIcon, UserIcon, CheckSquareIcon,
  KanbanIcon, CalendarDaysIcon, BarChart2Icon, GripVertical,
  ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, AlertCircleIcon,
  ClockIcon, CircleIcon, CircleDotIcon, CircleCheckIcon,
  FileTextIcon,
} from "lucide-react"
import {
  createBucket, renameBucket, deleteBucket, reorderBuckets,
  createTask, updateTask, deleteTask, saveTaskPositions,
  setTaskAssignees, addChecklistItem, toggleChecklistItem, deleteChecklistItem,
} from "./actions"

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = { id: string; name: string | null; email: string; image: string | null; role: string }

type ChecklistItem = { id: string; title: string; checked: boolean; order: number; createdAt: string; taskId: string }

type TaskAssignee = {
  id: string; taskId: string; userId: string
  user: { id: string; name: string | null; email: string; image: string | null }
}

type PlanTask = {
  id: string; title: string; notes: string | null; priority: string; progress: string
  startDate: string | null; dueDate: string | null; labels: string[]; order: number
  bucketId: string; projectId: string; createdAt: string; updatedAt: string
  assignees: TaskAssignee[]
  checklist: ChecklistItem[]
}

type Bucket = {
  id: string; name: string; order: number; projectId: string
  createdAt: string; updatedAt: string
  tasks: PlanTask[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITIES = [
  { value: "urgent",    label: "Urgent",    color: "text-red-500",    bg: "bg-red-500/10",    dot: "bg-red-500" },
  { value: "important", label: "Important", color: "text-orange-500", bg: "bg-orange-500/10", dot: "bg-orange-500" },
  { value: "medium",    label: "Medium",    color: "text-blue-500",   bg: "bg-blue-500/10",   dot: "bg-blue-500" },
  { value: "low",       label: "Low",       color: "text-gray-400",   bg: "bg-gray-500/10",   dot: "bg-gray-400" },
]

const PROGRESSES = [
  { value: "not_started", label: "Not started", icon: CircleIcon },
  { value: "in_progress", label: "In progress",  icon: CircleDotIcon },
  { value: "completed",   label: "Completed",    icon: CircleCheckIcon },
]

const LABEL_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
]

function getPriority(v: string) { return PRIORITIES.find((p) => p.value === v) ?? PRIORITIES[2] }
function getProgress(v: string) { return PROGRESSES.find((p) => p.value === v) ?? PROGRESSES[0] }

function getInitials(name: string | null, email: string) {
  return name ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() : email[0].toUpperCase()
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// ── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({
  task, isDragging = false, onClick, onQuickComplete,
}: {
  task: PlanTask; isDragging?: boolean; onClick: () => void; onQuickComplete: () => void
}) {
  const priority = getPriority(task.priority)
  const doneCount = task.checklist.filter((c) => c.checked).length
  const overdue = isOverdue(task.dueDate) && task.progress !== "completed"

  return (
    <div
      className={cn(
        "group rounded-xl border bg-card p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-px",
        task.progress === "completed" && "opacity-60",
        task.progress === "in_progress" && "border-l-2 border-l-blue-500",
        isDragging && "opacity-30 rotate-2 scale-95",
      )}
      onClick={onClick}
    >
      {/* Priority stripe */}
      <div className={cn("h-0.5 w-full rounded-full mb-2.5", priority.dot)} />

      <div className="flex items-start gap-2">
        {/* Quick complete button */}
        <button
          className={cn(
            "mt-0.5 shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
            task.progress === "completed" && "border-green-500 bg-green-500 text-white",
            task.progress === "in_progress" && "border-blue-500 bg-blue-500/10 text-blue-500",
            task.progress === "not_started" && "border-muted-foreground/40 hover:border-green-500",
          )}
          onClick={(e) => { e.stopPropagation(); onQuickComplete() }}
          title={task.progress === "completed" ? "Mark incomplete" : "Mark complete"}
        >
          {task.progress === "completed" && <CheckIcon className="h-2.5 w-2.5" />}
          {task.progress === "in_progress" && <CircleDotIcon className="h-2.5 w-2.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn("text-sm leading-snug font-medium", task.progress === "completed" && "line-through text-muted-foreground")}>
            {task.title}
          </p>

          {/* Labels */}
          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {task.labels.map((color) => (
                <span key={color} className="h-1.5 w-8 rounded-full" style={{ backgroundColor: color }} />
              ))}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.dueDate && (
              <span className={cn("flex items-center gap-0.5 text-xs", overdue ? "text-red-500" : "text-muted-foreground")}>
                <CalendarIcon className="h-3 w-3" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {task.checklist.length > 0 && (
              <span className={cn("flex items-center gap-0.5 text-xs text-muted-foreground", doneCount === task.checklist.length && "text-green-500")}>
                <CheckSquareIcon className="h-3 w-3" />
                {doneCount}/{task.checklist.length}
              </span>
            )}
          </div>
        </div>

        {/* Assignee avatars */}
        {task.assignees.length > 0 && (
          <div className="flex -space-x-1.5 shrink-0">
            {task.assignees.slice(0, 3).map((a) => (
              <Avatar key={a.id} className="h-5 w-5 border border-background">
                {a.user.image && <AvatarImage src={a.user.image} />}
                <AvatarFallback className="text-[8px]">{getInitials(a.user.name, a.user.email)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sortable Task Card ────────────────────────────────────────────────────────

function SortableTaskCard({ task, onClick, onQuickComplete }: { task: PlanTask; onClick: () => void; onQuickComplete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task, bucketId: task.bucketId },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="relative"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/50" />
      </div>
      <div className="group pl-1">
        <TaskCard task={task} isDragging={isDragging} onClick={onClick} onQuickComplete={onQuickComplete} />
      </div>
    </div>
  )
}

// ── Bucket Column ─────────────────────────────────────────────────────────────

function BucketColumn({
  bucket, allMembers, projectId, onTaskClick, onQuickComplete, onTaskCreate, onBucketDelete,
}: {
  bucket: Bucket; allMembers: Member[]; projectId: string
  onTaskClick: (task: PlanTask) => void
  onQuickComplete: (task: PlanTask) => void
  onTaskCreate: (bucketId: string, task: PlanTask) => void
  onBucketDelete: (bucketId: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [renaming, setRenaming] = useState(false)
  const [bucketName, setBucketName] = useState(bucket.name)
  const [, startTransition] = useTransition()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bucket.id,
    data: { type: "bucket" },
  })

  async function handleAddTask() {
    const t = newTitle.trim()
    if (!t) { setAdding(false); return }
    setNewTitle("")
    setAdding(false)
    startTransition(async () => {
      const task = await createTask(bucket.id, projectId, t)
      onTaskCreate(bucket.id, task as PlanTask)
    })
  }

  async function handleRenameBucket() {
    const n = bucketName.trim()
    if (!n || n === bucket.name) { setBucketName(bucket.name); setRenaming(false); return }
    setRenaming(false)
    startTransition(async () => { await renameBucket(bucket.id, projectId, n) })
  }

  async function handleDeleteBucket() {
    onBucketDelete(bucket.id)
    startTransition(async () => { await deleteBucket(bucket.id, projectId) })
  }

  const taskIds = bucket.tasks.map((t) => t.id)
  const completedCount = bucket.tasks.filter((t) => t.progress === "completed").length

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex flex-col w-72 shrink-0", isDragging && "opacity-50")}
    >
      {/* Bucket header */}
      <div className="flex items-center gap-2 mb-3 group/header">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-0 group-hover/header:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </div>
        {renaming ? (
          <input
            autoFocus
            value={bucketName}
            onChange={(e) => setBucketName(e.target.value)}
            onBlur={handleRenameBucket}
            onKeyDown={(e) => { if (e.key === "Enter") handleRenameBucket(); if (e.key === "Escape") { setBucketName(bucket.name); setRenaming(false) } }}
            className="flex-1 text-sm font-semibold bg-transparent outline-none border-b border-primary"
          />
        ) : (
          <button className="flex-1 text-sm font-semibold text-left hover:text-primary transition-colors truncate" onClick={() => setRenaming(true)}>
            {bucket.name}
          </button>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">{completedCount}/{bucket.tasks.length}</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/header:opacity-100">
              <MoreHorizontalIcon className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="end">
            <button className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors" onClick={() => setRenaming(true)}>
              Rename bucket
            </button>
            <button className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors" onClick={handleDeleteBucket}>
              <Trash2Icon className="h-3.5 w-3.5" /> Delete bucket
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Task list */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-10">
          {bucket.tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onQuickComplete={() => onQuickComplete(task)}
            />
          ))}
          {/* Sortable needs at least one item id — empty placeholder ensures drop zone works */}
        </div>
      </SortableContext>

      {/* Add task */}
      {adding ? (
        <div className="mt-2 rounded-xl border bg-card p-3">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); if (e.key === "Escape") { setAdding(false); setNewTitle("") } }}
            onBlur={handleAddTask}
            placeholder="Task name…"
            className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      ) : (
        <button
          className="mt-2 flex items-center gap-1.5 w-full rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          onClick={() => setAdding(true)}
        >
          <PlusIcon className="h-3.5 w-3.5" /> Add task
        </button>
      )}
    </div>
  )
}

// ── Board View ────────────────────────────────────────────────────────────────

function BoardView({
  buckets, members, projectId, onTaskClick,
  onBucketsChange, onQuickComplete, onTaskCreate, onBucketCreate,
}: {
  buckets: Bucket[]; members: Member[]; projectId: string
  onTaskClick: (task: PlanTask) => void
  onBucketsChange: (buckets: Bucket[]) => void
  onQuickComplete: (task: PlanTask) => void
  onTaskCreate: (bucketId: string, task: PlanTask) => void
  onBucketCreate: (bucket: Bucket) => void
}) {
  const [activeTask, setActiveTask] = useState<PlanTask | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function onDragStart({ active }: DragStartEvent) {
    if (active.data.current?.type === "task") setActiveTask(active.data.current.task)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeData = active.data.current
    if (activeData?.type !== "task") return
    const overId = over.id as string
    const activeBucketId = activeData.bucketId
    const overBucket = buckets.find((b) => b.id === overId)
    const overTaskBucketId = buckets.find((b) => b.tasks.some((t) => t.id === overId))?.id
    const targetBucketId = overBucket?.id ?? overTaskBucketId
    if (!targetBucketId || targetBucketId === activeBucketId) return

    onBucketsChange(buckets.map((b) => {
      if (b.id === activeBucketId) return { ...b, tasks: b.tasks.filter((t) => t.id !== active.id) }
      if (b.id === targetBucketId) return { ...b, tasks: [...b.tasks, { ...activeData.task, bucketId: targetBucketId }] }
      return b
    }))
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null)
    if (!over) return

    const activeData = active.data.current
    if (!activeData) return

    if (activeData.type === "bucket") {
      const oldIndex = buckets.findIndex((b) => b.id === active.id)
      const newIndex = buckets.findIndex((b) => b.id === over.id)
      if (oldIndex === newIndex) return
      const newBuckets = arrayMove(buckets, oldIndex, newIndex).map((b, i) => ({ ...b, order: i }))
      onBucketsChange(newBuckets)
      startTransition(async () => {
        await reorderBuckets(projectId, newBuckets.map((b) => ({ id: b.id, order: b.order })))
      })
      return
    }

    if (activeData.type === "task") {
      const overId = over.id as string
      const overBucketId = buckets.find((b) => b.id === overId)?.id
        ?? buckets.find((b) => b.tasks.some((t) => t.id === overId))?.id
      if (!overBucketId) return

      const bucket = buckets.find((b) => b.id === overBucketId)!
      const taskInBucket = bucket.tasks.find((t) => t.id === active.id)
      let newTasks: PlanTask[]

      if (taskInBucket) {
        const oldIdx = bucket.tasks.findIndex((t) => t.id === active.id)
        const newIdx = bucket.tasks.findIndex((t) => t.id === overId)
        if (oldIdx === newIdx) return
        newTasks = arrayMove(bucket.tasks, oldIdx, newIdx).map((t, i) => ({ ...t, order: i }))
      } else {
        newTasks = [...bucket.tasks, { ...activeData.task, bucketId: overBucketId }].map((t, i) => ({ ...t, order: i }))
      }

      const newBuckets = buckets.map((b) =>
        b.id === overBucketId ? { ...b, tasks: newTasks }
          : b.id === activeData.bucketId ? { ...b, tasks: b.tasks.filter((t) => t.id !== active.id) }
          : b,
      )
      onBucketsChange(newBuckets)

      const allUpdates = newTasks.map((t) => ({ id: t.id, bucketId: overBucketId, order: t.order }))
      if (activeData.bucketId !== overBucketId) {
        const srcBucket = newBuckets.find((b) => b.id === activeData.bucketId)!
        allUpdates.push(...srcBucket.tasks.map((t, i) => ({ id: t.id, bucketId: activeData.bucketId, order: i })))
      }
      startTransition(async () => { await saveTaskPositions(projectId, allUpdates) })
    }
  }

  const bucketIds = buckets.map((b) => b.id)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <SortableContext items={bucketIds} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-5 h-full items-start overflow-x-auto pb-6 pr-4">
          {buckets.map((bucket) => (
            <BucketColumn
              key={bucket.id}
              bucket={bucket}
              allMembers={members}
              projectId={projectId}
              onTaskClick={onTaskClick}
              onQuickComplete={onQuickComplete}
              onTaskCreate={onTaskCreate}
              onBucketDelete={(id) => onBucketsChange(buckets.filter((b) => b.id !== id))}
            />
          ))}
          <AddBucketButton projectId={projectId} onBucketCreate={onBucketCreate} />
        </div>
      </SortableContext>
      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 opacity-90 shadow-2xl w-72">
            <TaskCard task={activeTask} onClick={() => {}} onQuickComplete={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function AddBucketButton({ projectId, onBucketCreate }: { projectId: string; onBucketCreate: (bucket: Bucket) => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [, startTransition] = useTransition()

  async function handleAdd() {
    const n = name.trim()
    if (!n) { setAdding(false); return }
    setName(""); setAdding(false)
    startTransition(async () => {
      const bucket = await createBucket(projectId, n)
      onBucketCreate(bucket as Bucket)
    })
  }

  if (adding) {
    return (
      <div className="w-72 shrink-0 rounded-xl border bg-card p-4">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setName("") } }}
          onBlur={handleAdd}
          placeholder="Bucket name…"
          className="w-full text-sm bg-transparent outline-none border-b border-primary pb-1"
        />
      </div>
    )
  }

  return (
    <button
      className="w-72 shrink-0 flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
      onClick={() => setAdding(true)}
    >
      <PlusIcon className="h-4 w-4" /> Add bucket
    </button>
  )
}

// ── Schedule View ─────────────────────────────────────────────────────────────

function ScheduleView({ buckets }: { buckets: Bucket[] }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const allTasks = buckets.flatMap((b) => b.tasks.filter((t) => t.dueDate || t.startDate))

  function getTaskBar(task: PlanTask) {
    const start = task.startDate ? new Date(task.startDate) : task.dueDate ? new Date(task.dueDate) : null
    const end = task.dueDate ? new Date(task.dueDate) : start
    if (!start || !end) return null

    const weekStart = days[0].getTime()
    const weekEnd = days[6].getTime() + 86400000
    if (end.getTime() < weekStart || start.getTime() > weekEnd) return null

    const clampedStart = Math.max(start.getTime(), weekStart)
    const clampedEnd = Math.min(end.getTime(), weekEnd)
    const left = ((clampedStart - weekStart) / (weekEnd - weekStart)) * 100
    const width = Math.max(((clampedEnd - clampedStart) / (weekEnd - weekStart)) * 100, 2)

    return { left, width }
  }

  const priority = (t: PlanTask) => getPriority(t.priority)

  return (
    <div className="flex-1 overflow-auto">
      {/* Week nav */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold">
          {days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
          {days[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w - 1)}>‹</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w + 1)}>›</Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {days.map((d) => {
          const isToday = d.toDateString() === today.toDateString()
          return (
            <div key={d.toISOString()} className="text-center">
              <p className="text-xs text-muted-foreground">{d.toLocaleDateString(undefined, { weekday: "short" })}</p>
              <div className={cn("text-sm font-medium mx-auto w-7 h-7 flex items-center justify-center rounded-full", isToday && "bg-primary text-primary-foreground")}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Grid + task bars */}
      <div className="relative border rounded-xl overflow-hidden">
        {/* Day columns background */}
        <div className="grid grid-cols-7">
          {days.map((d) => (
            <div key={d.toISOString()} className={cn("border-r last:border-r-0 min-h-96", d.toDateString() === today.toDateString() && "bg-primary/3")} />
          ))}
        </div>

        {/* Task bars */}
        <div className="absolute inset-0 p-2 pointer-events-none">
          {allTasks.length === 0 && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No tasks with dates this week
            </div>
          )}
          {allTasks.map((task, i) => {
            const bar = getTaskBar(task)
            if (!bar) return null
            const p = priority(task)
            return (
              <div
                key={task.id}
                className={cn("absolute rounded-md px-2 py-0.5 text-xs font-medium truncate pointer-events-auto cursor-pointer hover:opacity-90", p.bg, p.color)}
                style={{ left: `${bar.left}%`, width: `${bar.width}%`, top: `${i * 28 + 8}px` }}
                title={task.title}
              >
                {task.title}
              </div>
            )
          })}
        </div>
      </div>

      {allTasks.length === 0 && (
        <p className="text-center text-sm text-muted-foreground mt-8">Assign due dates to tasks to see them here.</p>
      )}
    </div>
  )
}

// ── Chart View ────────────────────────────────────────────────────────────────

function DonutChart({ segments, size = 120 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const r = 40; const cx = 60; const cy = 60
  const circumference = 2 * Math.PI * r

  let offset = 0
  const arcs = segments.map((seg) => {
    const frac = total > 0 ? seg.value / total : 0
    const dash = frac * circumference
    const arc = { ...seg, dash, offset: circumference - offset }
    offset += dash
    return arc
  })

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="-rotate-90">
      {total === 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="18" className="text-muted/30" />
      ) : (
        arcs.map((arc, i) => (
          arc.value > 0 && (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth="18"
              strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
              strokeDashoffset={arc.offset}
            />
          )
        ))
      )}
    </svg>
  )
}

function ChartView({ buckets }: { buckets: Bucket[] }) {
  const allTasks = buckets.flatMap((b) => b.tasks)
  const total = allTasks.length
  const byProgress = PROGRESSES.map((p) => ({ ...p, count: allTasks.filter((t) => t.progress === p.value).length }))
  const byPriority = PRIORITIES.map((p) => ({ ...p, count: allTasks.filter((t) => t.priority === p.value).length }))

  const progressColors: Record<string, string> = { not_started: "#94a3b8", in_progress: "#3b82f6", completed: "#22c55e" }
  const priorityColors: Record<string, string> = { urgent: "#ef4444", important: "#f97316", medium: "#3b82f6", low: "#94a3b8" }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center py-24">
        <BarChart2Icon className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <p className="text-sm text-muted-foreground">No tasks yet. Create some tasks to see stats.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
      {/* Progress donut */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">By progress</h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            <DonutChart segments={byProgress.map((p) => ({ value: p.count, color: progressColors[p.value], label: p.label }))} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{total}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {byProgress.map((p) => {
              const ProgressIcon = p.icon
              return (
                <div key={p.value} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: progressColors[p.value] }} />
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="font-semibold ml-auto">{p.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Priority donut */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">By priority</h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            <DonutChart segments={byPriority.map((p) => ({ value: p.count, color: priorityColors[p.value], label: p.label }))} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{total}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {byPriority.map((p) => (
              <div key={p.value} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: priorityColors[p.value] }} />
                <span className="text-muted-foreground">{p.label}</span>
                <span className="font-semibold ml-auto">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bucket breakdown */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">By bucket</h3>
        <div className="space-y-3">
          {buckets.map((b) => {
            const done = b.tasks.filter((t) => t.progress === "completed").length
            const pct = b.tasks.length > 0 ? (done / b.tasks.length) * 100 : 0
            return (
              <div key={b.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium truncate max-w-32">{b.name}</span>
                  <span className="text-muted-foreground tabular-nums">{done}/{b.tasks.length}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Date Picker ───────────────────────────────────────────────────────────────

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString(undefined, { month: "long", year: "numeric" })

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) } else setViewMonth((m) => m - 1) }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) } else setViewMonth((m) => m + 1) }
  function selectDay(day: number) {
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
    setOpen(false)
  }

  const isSelected = (day: number) => !!selected && selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === day
  const isToday = (day: number) => today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const label = value ? new Date(value + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Pick a date"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("flex items-center gap-1.5 text-xs rounded-md border px-2 py-1 hover:bg-accent transition-colors", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="start">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-muted transition-colors"><ChevronLeftIcon className="h-4 w-4" /></button>
          <span className="text-xs font-semibold">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-muted transition-colors"><ChevronRightIcon className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => day ? (
            <button key={i} onClick={() => selectDay(day)} className={cn("w-full aspect-square flex items-center justify-center rounded-lg text-xs transition-colors", isSelected(day) && "bg-primary text-primary-foreground font-semibold", !isSelected(day) && isToday(day) && "border border-primary text-primary font-semibold", !isSelected(day) && !isToday(day) && "hover:bg-muted")}>
              {day}
            </button>
          ) : <div key={i} />)}
        </div>
        {value && (
          <button onClick={() => { onChange(""); setOpen(false) }} className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-destructive transition-colors">
            Clear date
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ── Task Detail Sheet ─────────────────────────────────────────────────────────

function TaskDetailSheet({
  task, buckets, members, projectId, onClose, onTaskChange, onTaskDelete,
}: {
  task: PlanTask | null; buckets: Bucket[]; members: Member[]; projectId: string
  onClose: () => void; onTaskChange: (task: PlanTask) => void; onTaskDelete: (taskId: string) => void
}) {
  const [, startTransition] = useTransition()
  const [checklistInput, setChecklistInput] = useState("")
  const open = !!task

  if (!task) return <Sheet open={false}><SheetContent /></Sheet>

  async function handleUpdate(data: Partial<PlanTask>) {
    const updated = { ...task!, ...data }
    onTaskChange(updated)
    startTransition(async () => {
      await updateTask(task!.id, projectId, {
        title: updated.title,
        notes: updated.notes,
        priority: updated.priority,
        progress: updated.progress,
        startDate: updated.startDate ? new Date(updated.startDate) : null,
        dueDate: updated.dueDate ? new Date(updated.dueDate) : null,
        labels: updated.labels,
      })
    })
  }

  async function handleAssigneesChange(userIds: string[]) {
    const newAssignees: TaskAssignee[] = members
      .filter((m) => userIds.includes(m.id))
      .map((m) => ({ id: "", taskId: task!.id, userId: m.id, user: m }))
    onTaskChange({ ...task!, assignees: newAssignees })
    startTransition(async () => { await setTaskAssignees(task!.id, projectId, userIds) })
  }

  async function handleAddChecklist() {
    const t = checklistInput.trim()
    if (!t) return
    setChecklistInput("")
    startTransition(async () => {
      const item = await addChecklistItem(task!.id, projectId, t)
      onTaskChange({
        ...task!,
        checklist: [...task!.checklist, { ...item, createdAt: item.createdAt.toString() }],
      })
    })
  }

  async function handleToggleChecklist(item: ChecklistItem) {
    onTaskChange({ ...task!, checklist: task!.checklist.map((c) => c.id === item.id ? { ...c, checked: !c.checked } : c) })
    startTransition(async () => { await toggleChecklistItem(item.id, task!.id, projectId, !item.checked) })
  }

  async function handleDeleteChecklist(itemId: string) {
    onTaskChange({ ...task!, checklist: task!.checklist.filter((c) => c.id !== itemId) })
    startTransition(async () => { await deleteChecklistItem(itemId, task!.id, projectId) })
  }

  async function handleDeleteTask() {
    onTaskDelete(task!.id)
    onClose()
    startTransition(async () => { await deleteTask(task!.id, projectId) })
  }

  const priority = getPriority(task.priority)
  const progress = getProgress(task.progress)
  const ProgressIcon = progress.icon
  const doneCount = task.checklist.filter((c) => c.checked).length
  const assigneeIds = task.assignees.map((a) => a.userId)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0" side="right" showCloseButton={false}>
        <VisuallyHidden><SheetTitle>{task.title}</SheetTitle></VisuallyHidden>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className={cn("flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full", priority.bg, priority.color)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", priority.dot)} />
            {priority.label}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDeleteTask}>
              <Trash2Icon className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <XIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {/* Title */}
          <input
            className="text-xl font-semibold bg-transparent outline-none w-full placeholder:text-muted-foreground/40"
            value={task.title}
            onChange={(e) => onTaskChange({ ...task, title: e.target.value })}
            onBlur={(e) => handleUpdate({ title: e.target.value })}
            placeholder="Task name"
          />

          {/* Property grid */}
          <div className="grid gap-3">
            {/* Progress */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Progress</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs rounded-md border px-2 py-1 hover:bg-accent transition-colors">
                    <ProgressIcon className="h-3.5 w-3.5" />
                    {progress.label}
                    <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1">
                  {PROGRESSES.map((p) => {
                    const Icon = p.icon
                    return (
                      <button
                        key={p.value}
                        className={cn("flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent", task.progress === p.value && "bg-accent")}
                        onClick={() => handleUpdate({ progress: p.value })}
                      >
                        <Icon className="h-3.5 w-3.5" /> {p.label}
                      </button>
                    )
                  })}
                </PopoverContent>
              </Popover>
            </div>

            {/* Priority */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Priority</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn("flex items-center gap-1.5 text-xs rounded-md border px-2 py-1 hover:bg-accent transition-colors", priority.color)}>
                    <FlagIcon className="h-3.5 w-3.5" />
                    {priority.label}
                    <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      className={cn("flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent", task.priority === p.value && "bg-accent", p.color)}
                      onClick={() => handleUpdate({ priority: p.value })}
                    >
                      <span className={cn("h-2 w-2 rounded-full", p.dot)} /> {p.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>

            {/* Bucket */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Bucket</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs rounded-md border px-2 py-1 hover:bg-accent transition-colors">
                    <KanbanIcon className="h-3.5 w-3.5" />
                    {buckets.find((b) => b.id === task.bucketId)?.name ?? "—"}
                    <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1">
                  {buckets.map((b) => (
                    <button
                      key={b.id}
                      className={cn("flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent", task.bucketId === b.id && "bg-accent")}
                      onClick={() => {
                        onTaskChange({ ...task, bucketId: b.id })
                        startTransition(async () => {
                          await saveTaskPositions(projectId, [{ id: task.id, bucketId: b.id, order: task.order }])
                        })
                      }}
                    >
                      {b.name}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>

            {/* Assignees */}
            <div className="flex items-start gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0 mt-1">Assignees</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex flex-wrap items-center gap-1.5 text-xs rounded-md border px-2 py-1 hover:bg-accent transition-colors min-w-0">
                    {task.assignees.length === 0 ? (
                      <><UserIcon className="h-3.5 w-3.5" /> None</>
                    ) : (
                      task.assignees.map((a) => (
                        <Avatar key={a.id} className="h-5 w-5">
                          {a.user.image && <AvatarImage src={a.user.image} />}
                          <AvatarFallback className="text-[8px]">{getInitials(a.user.name, a.user.email)}</AvatarFallback>
                        </Avatar>
                      ))
                    )}
                    <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1">
                  {members.map((m) => {
                    const checked = assigneeIds.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                        onClick={() => handleAssigneesChange(checked ? assigneeIds.filter((id) => id !== m.id) : [...assigneeIds, m.id])}
                      >
                        <Checkbox checked={checked} className="h-3.5 w-3.5" />
                        <Avatar className="h-5 w-5">
                          {m.image && <AvatarImage src={m.image} />}
                          <AvatarFallback className="text-[8px]">{getInitials(m.name, m.email)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{m.name ?? m.email}</span>
                      </button>
                    )
                  })}
                </PopoverContent>
              </Popover>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Start date</span>
              <DatePicker
                value={task.startDate ? task.startDate.slice(0, 10) : ""}
                onChange={(val) => handleUpdate({ startDate: val ? new Date(val + "T00:00").toISOString() : null })}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Due date</span>
              <DatePicker
                value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                onChange={(val) => handleUpdate({ dueDate: val ? new Date(val + "T00:00").toISOString() : null })}
              />
            </div>

            {/* Labels */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Labels</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {LABEL_COLORS.map((color) => {
                  const active = task.labels.includes(color)
                  return (
                    <button
                      key={color}
                      className={cn("h-5 w-5 rounded-full border-2 transition-transform hover:scale-110", active ? "border-foreground scale-110" : "border-transparent")}
                      style={{ backgroundColor: color }}
                      onClick={() => handleUpdate({ labels: active ? task.labels.filter((l) => l !== color) : [...task.labels, color] })}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Notes</p>
            <Textarea
              value={task.notes ?? ""}
              onChange={(e) => onTaskChange({ ...task, notes: e.target.value })}
              onBlur={(e) => handleUpdate({ notes: e.target.value || null })}
              placeholder="Add notes…"
              className="text-sm resize-none min-h-24"
            />
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">
                Checklist {task.checklist.length > 0 && <span className="ml-1 text-muted-foreground/60">{doneCount}/{task.checklist.length}</span>}
              </p>
            </div>
            {task.checklist.length > 0 && (
              <div className="mb-2 flex flex-col gap-1.5">
                {task.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group/item">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => handleToggleChecklist(item)}
                      className="h-3.5 w-3.5"
                    />
                    <span className={cn("flex-1 text-sm", item.checked && "line-through text-muted-foreground")}>{item.title}</span>
                    <button
                      className="opacity-0 group-hover/item:opacity-100 p-0.5 rounded hover:bg-accent transition-all"
                      onClick={() => handleDeleteChecklist(item.id)}
                    >
                      <XIcon className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddChecklist()}
                placeholder="Add item…"
                className="flex-1 text-sm bg-transparent border-b border-muted-foreground/20 outline-none py-1 focus:border-primary transition-colors placeholder:text-muted-foreground/40"
              />
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleAddChecklist} disabled={!checklistInput.trim()}>
                <PlusIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Main Shell ────────────────────────────────────────────────────────────────

export function PlannerShell({
  buckets: initialBuckets, members, projectId, projectName, workspaceName,
}: {
  buckets: Bucket[]; members: Member[]; projectId: string; projectName: string; workspaceName: string
}) {
  const [view, setView] = useState<"board" | "schedule" | "chart">("board")
  const [buckets, setBuckets] = useState<Bucket[]>(initialBuckets)
  const [selectedTask, setSelectedTask] = useState<PlanTask | null>(null)
  const [, startTransition] = useTransition()

  function handleTaskClick(task: PlanTask) {
    // Find latest version of task from state
    const current = buckets.flatMap((b) => b.tasks).find((t) => t.id === task.id) ?? task
    setSelectedTask(current)
  }

  function handleTaskChange(updated: PlanTask) {
    setSelectedTask((prev) => (prev?.id === updated.id ? updated : prev))
    setBuckets((prev) =>
      prev.map((b) => ({
        ...b,
        tasks: b.tasks.map((t) => (t.id === updated.id ? updated : t)),
      })),
    )
  }

  function handleQuickComplete(task: PlanTask) {
    const newProgress = task.progress === "completed" ? "not_started" : "completed"
    const updated = { ...task, progress: newProgress }
    handleTaskChange(updated)
    startTransition(async () => { await updateTask(task.id, projectId, { progress: newProgress }) })
  }

  function handleTaskCreate(bucketId: string, task: PlanTask) {
    setBuckets((prev) =>
      prev.map((b) => b.id === bucketId ? { ...b, tasks: [...b.tasks, task] } : b),
    )
  }

  function handleBucketCreate(bucket: Bucket) {
    setBuckets((prev) => [...prev, bucket])
  }

  function handleTaskDelete(taskId: string) {
    setBuckets((prev) =>
      prev.map((b) => ({ ...b, tasks: b.tasks.filter((t) => t.id !== taskId) })),
    )
  }

  const tabs = [
    { value: "board" as const, label: "Board", icon: KanbanIcon },
    { value: "schedule" as const, label: "Schedule", icon: CalendarDaysIcon },
    { value: "chart" as const, label: "Charts", icon: BarChart2Icon },
  ]

  const allTasks = buckets.flatMap((b) => b.tasks)
  const completedCount = allTasks.filter((t) => t.progress === "completed").length

  return (
    <>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4 w-full">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
          <Breadcrumb className="flex-1 min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">{workspaceName}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href={`/dashboard/projects/${projectId}`}>{projectName}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Planner</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-1 ml-auto">
            {allTasks.length > 0 && (
              <span className="text-xs text-muted-foreground mr-2 hidden sm:block">
                {completedCount}/{allTasks.length} completed
              </span>
            )}
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Button
                  key={tab.value}
                  variant={view === tab.value ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setView(tab.value)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className={cn("flex-1 overflow-hidden", view !== "board" && "overflow-y-auto")}>
        <div className={cn("h-full", view === "board" ? "p-6 overflow-x-auto" : "p-6 sm:p-8")}>
          {view === "board" && (
            <BoardView
              buckets={buckets}
              members={members}
              projectId={projectId}
              onTaskClick={handleTaskClick}
              onBucketsChange={setBuckets}
              onQuickComplete={handleQuickComplete}
              onTaskCreate={handleTaskCreate}
              onBucketCreate={handleBucketCreate}
            />
          )}
          {view === "schedule" && <ScheduleView buckets={buckets} />}
          {view === "chart" && <ChartView buckets={buckets} />}
        </div>
      </div>

      <TaskDetailSheet
        task={selectedTask}
        buckets={buckets}
        members={members}
        projectId={projectId}
        onClose={() => setSelectedTask(null)}
        onTaskChange={handleTaskChange}
        onTaskDelete={handleTaskDelete}
      />
    </>
  )
}
