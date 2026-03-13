"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useEditor, EditorContent, Extension } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import { TextStyle } from "@tiptap/extension-text-style"
import Highlight from "@tiptap/extension-highlight"
import Typography from "@tiptap/extension-typography"
import Suggestion from "@tiptap/suggestion"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ProjectIcon } from "@/components/project-icon"
import { PROJECT_ICONS } from "@/lib/validations/project"
import {
  PlusIcon,
  Trash2Icon,
  MoreHorizontalIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  BoldIcon,
  ItalicIcon,
  CodeIcon,
  HighlighterIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  CheckSquareIcon,
  CodeSquareIcon,
  QuoteIcon,
  MinusIcon,
  TypeIcon,
  SmileIcon,
  LayersIcon,
  HistoryIcon,
  XIcon,
  RotateCcwIcon,
  ClockIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateDocContent, updateDocIcon, deleteDoc, createDoc, getDocVersions, restoreDocVersion } from "../actions"

// ── Types ─────────────────────────────────────────────────────────────────────

type DocType = {
  id: string
  title: string
  icon: string
  content: object
  projectId: string
}

type DocListItem = {
  id: string
  title: string
  icon: string
  parentId: string | null
  order: number
}

type DocVersionItem = {
  id: string
  docId: string
  title: string
  content: unknown
  authorId: string
  createdAt: Date
  author: { id: string; name: string | null; email: string }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(date).toLocaleDateString()
}

type SlashCommand = {
  title: string
  description: string
  icon: React.ReactNode
  keywords?: string[]
  command: (props: { editor: any; range: any }) => void
}

// ── Slash commands ────────────────────────────────────────────────────────────

const SLASH_COMMANDS: SlashCommand[] = [
  {
    title: "Text",
    description: "Plain paragraph",
    icon: <TypeIcon className="h-4 w-4" />,
    keywords: ["p", "paragraph", "text"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Big section heading",
    icon: <Heading1Icon className="h-4 w-4" />,
    keywords: ["h1", "heading", "title"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2Icon className="h-4 w-4" />,
    keywords: ["h2", "heading", "subtitle"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: <Heading3Icon className="h-4 w-4" />,
    keywords: ["h3", "heading"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    description: "Unordered list",
    icon: <ListIcon className="h-4 w-4" />,
    keywords: ["ul", "bullet", "list"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Ordered list",
    icon: <ListOrderedIcon className="h-4 w-4" />,
    keywords: ["ol", "numbered", "ordered"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "To-do List",
    description: "Task checklist",
    icon: <CheckSquareIcon className="h-4 w-4" />,
    keywords: ["todo", "task", "checkbox"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Code Block",
    description: "Monospace code block",
    icon: <CodeSquareIcon className="h-4 w-4" />,
    keywords: ["code", "codeblock", "pre"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Quote",
    description: "Blockquote",
    icon: <QuoteIcon className="h-4 w-4" />,
    keywords: ["quote", "blockquote"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Divider",
    description: "Horizontal rule",
    icon: <MinusIcon className="h-4 w-4" />,
    keywords: ["hr", "divider", "separator"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
]

function filterSlashCommands(query: string) {
  if (!query) return SLASH_COMMANDS
  const q = query.toLowerCase()
  return SLASH_COMMANDS.filter(
    (c) => c.title.toLowerCase().includes(q) || c.keywords?.some((k) => k.includes(q)),
  )
}

// ── Doc icon (emoji or lucide) ────────────────────────────────────────────────

const PROJECT_ICON_SET = new Set(PROJECT_ICONS as readonly string[])

function DocIcon({ icon, className }: { icon: string; className?: string }) {
  if (PROJECT_ICON_SET.has(icon)) {
    return <ProjectIcon icon={icon} className={className ?? "h-5 w-5"} />
  }
  return <span className="leading-none">{icon}</span>
}

// ── Icon picker ───────────────────────────────────────────────────────────────

const EMOJI_OPTIONS = [
  "📄", "📝", "📋", "📌", "📎", "🗒️", "📓", "📔", "📒", "📃",
  "📑", "🗂️", "📁", "📂", "🗃️", "📊", "📈", "📉", "🗓️", "📅",
  "💡", "🔍", "🎯", "✅", "⭐", "🚀", "💻", "🎨", "🔧", "⚙️",
  "🏗️", "🧩", "🔐", "📡", "🌐", "🎪", "🧪", "🔬", "📸", "🎬",
]

function IconPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string
  onSelect: (icon: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<"emoji" | "icons">(
    PROJECT_ICON_SET.has(current) ? "icons" : "emoji",
  )

  return (
    <div
      data-icon-picker
      className="absolute top-full left-0 mt-2 z-50 bg-popover border rounded-xl shadow-xl w-80"
    >
      <div className="flex border-b">
        <button
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
            tab === "emoji"
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("emoji")}
        >
          <SmileIcon className="h-3.5 w-3.5" />
          Emoji
        </button>
        <button
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
            tab === "icons"
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("icons")}
        >
          <LayersIcon className="h-3.5 w-3.5" />
          Icons
        </button>
      </div>
      <div className="p-3">
        {tab === "emoji" ? (
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                className={cn(
                  "text-xl p-1.5 rounded-lg hover:bg-accent transition-colors leading-none",
                  current === emoji && "bg-accent",
                )}
                onClick={() => { onSelect(emoji); onClose() }}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1">
            {PROJECT_ICONS.map((icn) => (
              <button
                key={icn}
                title={icn}
                className={cn(
                  "flex items-center justify-center aspect-square rounded-lg transition-all p-2",
                  current === icn
                    ? "bg-linear-to-br from-violet-500 to-blue-500 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                onClick={() => { onSelect(icn); onClose() }}
              >
                <ProjectIcon icon={icn} className="h-5 w-5" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Docs sidebar ──────────────────────────────────────────────────────────────

function DocsSidebar({
  docs,
  activeDocId,
  projectId,
  projectName,
  onCreateDoc,
}: {
  docs: DocListItem[]
  activeDocId: string
  projectId: string
  projectName: string
  onCreateDoc: (parentId?: string | null) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const rootDocs = docs.filter((d) => !d.parentId)
  const childrenOf = (parentId: string) => docs.filter((d) => d.parentId === parentId)

  function DocItem({ doc, depth = 0 }: { doc: DocListItem; depth?: number }) {
    const children = childrenOf(doc.id)
    const hasChildren = children.length > 0
    const isExpanded = expanded.has(doc.id)
    const isActive = doc.id === activeDocId

    return (
      <div>
        <div
          className={cn(
            "group flex items-center gap-1 rounded-md py-1 text-sm cursor-pointer transition-colors select-none",
            isActive
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
          style={{ paddingLeft: `${0.375 + depth * 0.875}rem`, paddingRight: "0.375rem" }}
        >
          <button
            className={cn(
              "p-0.5 rounded transition-colors shrink-0",
              hasChildren ? "opacity-60 hover:opacity-100" : "opacity-0 pointer-events-none",
            )}
            onClick={(e) => {
              e.preventDefault()
              setExpanded((prev) => {
                const next = new Set(prev)
                if (next.has(doc.id)) next.delete(doc.id)
                else next.add(doc.id)
                return next
              })
            }}
          >
            {isExpanded ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
          </button>
          <Link
            href={`/dashboard/projects/${projectId}/docs/${doc.id}`}
            className="flex flex-1 items-center gap-2 min-w-0 py-0.5"
          >
            <span className="shrink-0 flex items-center justify-center w-4 h-4">
              <DocIcon icon={doc.icon} className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-xs">{doc.title || "Untitled"}</span>
          </Link>
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent transition-all shrink-0"
            onClick={(e) => { e.preventDefault(); onCreateDoc(doc.id) }}
            title="Add sub-page"
          >
            <PlusIcon className="h-3 w-3" />
          </button>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {children.map((child) => <DocItem key={child.id} doc={child} depth={depth + 1} />)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-56 shrink-0 border-r flex flex-col h-full overflow-hidden bg-sidebar">
      <div className="flex items-center justify-between px-3 py-3 border-b">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground uppercase tracking-wider truncate transition-colors"
        >
          {projectName}
        </Link>
        <button
          className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => onCreateDoc(null)}
          title="New page"
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1.5 px-1.5">
        {rootDocs.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">No pages yet</p>
        ) : (
          rootDocs.map((doc) => <DocItem key={doc.id} doc={doc} />)
        )}
      </div>
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function DocEditor({
  doc,
  allDocs,
  projectId,
  projectName,
  workspaceName,
}: {
  doc: DocType
  allDocs: DocListItem[]
  projectId: string
  projectName: string
  workspaceName: string
}) {
  const [title, setTitle] = useState(doc.title)
  const [icon, setIcon] = useState(doc.icon)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [versions, setVersions] = useState<DocVersionItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Slash menu state
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashItems, setSlashItems] = useState<SlashCommand[]>(SLASH_COMMANDS)
  const [slashPos, setSlashPos] = useState<{ top: number; left: number } | null>(null)
  const [slashIdx, setSlashIdx] = useState(0)
  const slashItemsRef = useRef<SlashCommand[]>(SLASH_COMMANDS)
  const slashIdxRef = useRef(0)
  const suggestionRef = useRef<any>(null)

  const scheduleSave = useCallback(
    (newTitle: string, content: object) => {
      setSaveStatus("unsaved")
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus("saving")
        startTransition(async () => {
          await updateDocContent(doc.id, newTitle, content)
          setSaveStatus("saved")
        })
      }, 1500)
    },
    [doc.id],
  )

  const slashExtension = useMemo(
    () =>
      Extension.create({
        name: "slashCommands",
        addProseMirrorPlugins() {
          return [
            Suggestion({
              editor: this.editor,
              char: "/",
              items: ({ query }: { query: string }) => filterSlashCommands(query),
              render: () => ({
                onStart: (props: any) => {
                  suggestionRef.current = props
                  const rect = props.clientRect?.()
                  setSlashItems(props.items)
                  slashItemsRef.current = props.items
                  setSlashIdx(0); slashIdxRef.current = 0
                  if (rect) setSlashPos({ top: rect.bottom + 8, left: Math.min(rect.left, globalThis.innerWidth - 300) })
                  setSlashOpen(true)
                },
                onUpdate: (props: any) => {
                  suggestionRef.current = props
                  const rect = props.clientRect?.()
                  setSlashItems(props.items)
                  slashItemsRef.current = props.items
                  setSlashIdx(0); slashIdxRef.current = 0
                  if (rect) setSlashPos({ top: rect.bottom + 8, left: Math.min(rect.left, globalThis.innerWidth - 300) })
                },
                onExit: () => { suggestionRef.current = null; setSlashOpen(false) },
                onKeyDown: (props: any) => {
                  const { event } = props
                  if (event.key === "Escape") { setSlashOpen(false); return true }
                  if (event.key === "ArrowDown") {
                    const next = (slashIdxRef.current + 1) % (slashItemsRef.current.length || 1)
                    slashIdxRef.current = next; setSlashIdx(next); return true
                  }
                  if (event.key === "ArrowUp") {
                    const next = (slashIdxRef.current - 1 + (slashItemsRef.current.length || 1)) % (slashItemsRef.current.length || 1)
                    slashIdxRef.current = next; setSlashIdx(next); return true
                  }
                  if (event.key === "Enter") {
                    const item = slashItemsRef.current[slashIdxRef.current]
                    if (item && suggestionRef.current)
                      item.command({ editor: suggestionRef.current.editor, range: suggestionRef.current.range })
                    setSlashOpen(false); return true
                  }
                  return false
                },
              }),
              command: ({ editor, range, props: item }: any) => item.command({ editor, range }),
            }),
          ]
        },
      }),
    [],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "heading" ? "Heading" : "Type '/' for commands…",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Highlight.configure({ multicolor: false }),
      Typography,
      slashExtension,
    ],
    immediatelyRender: false,
    content: Object.keys(doc.content ?? {}).length === 0 ? "" : (doc.content as any),
    editorProps: { attributes: { class: "doc-editor-content outline-none min-h-64" } },
    onUpdate: ({ editor }) => scheduleSave(title, editor.getJSON()),
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      if (from === to) { setBubblePos(null); return }
      const sel = globalThis.getSelection()
      if (!sel || sel.rangeCount === 0) { setBubblePos(null); return }
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      if (!rect.width) { setBubblePos(null); return }
      setBubblePos({ top: rect.top - 52, left: rect.left + rect.width / 2 })
    },
    onBlur: () => setBubblePos(null),
  })

  useEffect(() => {
    if (!showIconPicker) return
    function handler(e: MouseEvent) {
      if (!(e.target as Element).closest("[data-icon-picker]")) setShowIconPicker(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showIconPicker])

  function handleTitleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value.replace(/\n/g, "")
    setTitle(v)
    if (editor) scheduleSave(v, editor.getJSON())
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); editor?.commands.focus("start") }
  }

  async function handleIconSelect(newIcon: string) {
    setIcon(newIcon)
    await updateDocIcon(doc.id, newIcon)
  }

  function handleCreateDoc(parentId?: string | null) {
    startTransition(async () => { await createDoc(projectId, parentId) })
  }

  function handleDelete() {
    startTransition(async () => { await deleteDoc(doc.id, projectId) })
  }

  async function handleOpenHistory() {
    setHistoryOpen(true)
    setHistoryLoading(true)
    const data = await getDocVersions(doc.id)
    setVersions(data as DocVersionItem[])
    setHistoryLoading(false)
  }

  async function handleRestore(version: DocVersionItem) {
    setRestoringId(version.id)
    await restoreDocVersion(doc.id, version.id)
    setTitle(version.title)
    if (editor) editor.commands.setContent(version.content as any)
    setSaveStatus("saved")
    setRestoringId(null)
  }

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
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href={`/dashboard/projects/${projectId}/docs`}>Docs</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-40 truncate">{title || "Untitled"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <span
              className={cn(
                "text-xs transition-colors",
                saveStatus === "saved"
                  ? "text-muted-foreground/40"
                  : saveStatus === "saving"
                    ? "text-muted-foreground"
                    : "text-orange-500",
              )}
            >
              {saveStatus === "saving" ? "Saving…" : saveStatus === "unsaved" ? "Unsaved" : "Saved"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", historyOpen && "bg-accent")}
              title="Version history"
              onClick={() => historyOpen ? setHistoryOpen(false) : handleOpenHistory()}
            >
              <HistoryIcon className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2Icon className="h-4 w-4 mr-2" />
                  Delete page
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <DocsSidebar
          docs={allDocs}
          activeDocId={doc.id}
          projectId={projectId}
          projectName={projectName}
          onCreateDoc={handleCreateDoc}
        />

        {/* History panel */}
        {historyOpen && (
          <div className="w-72 shrink-0 border-l flex flex-col h-full overflow-hidden bg-sidebar">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Version history</span>
              </div>
              <button
                className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                onClick={() => setHistoryOpen(false)}
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <ClockIcon className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No versions yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Versions are saved automatically as you edit.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {versions.map((v, i) => (
                    <div key={v.id} className="px-4 py-3 hover:bg-accent/30 transition-colors group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{v.title || "Untitled"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(v.createdAt)}</p>
                          <p className="text-xs text-muted-foreground/60 truncate">{v.author.name ?? v.author.email}</p>
                        </div>
                        {i > 0 && (
                          <button
                            className={cn(
                              "shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors",
                              restoringId === v.id
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-accent hover:border-accent-foreground/20",
                            )}
                            disabled={restoringId !== null}
                            onClick={() => handleRestore(v)}
                            title="Restore this version"
                          >
                            <RotateCcwIcon className={cn("h-3 w-3", restoringId === v.id && "animate-spin")} />
                            Restore
                          </button>
                        )}
                        {i === 0 && (
                          <span className="shrink-0 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 sm:px-16 py-12">
            {/* Icon */}
            <div className="relative mb-2" data-icon-picker>
              <button
                className="flex items-center justify-center w-14 h-14 hover:bg-accent rounded-xl transition-colors"
                onClick={() => setShowIconPicker(!showIconPicker)}
                title="Change icon"
              >
                {PROJECT_ICON_SET.has(icon) ? (
                  <ProjectIcon icon={icon} className="h-8 w-8 text-foreground" />
                ) : (
                  <span className="text-4xl leading-none">{icon}</span>
                )}
              </button>
              {showIconPicker && (
                <IconPicker
                  current={icon}
                  onSelect={handleIconSelect}
                  onClose={() => setShowIconPicker(false)}
                />
              )}
            </div>

            {/* Title */}
            <textarea
              className="w-full text-4xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/30 resize-none overflow-hidden leading-tight mb-8"
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled"
              rows={1}
              style={{ height: "auto" }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = "auto"
                t.style.height = t.scrollHeight + "px"
              }}
            />

            {/* Bubble menu */}
            {editor && bubblePos && (
              <div
                style={{ position: "fixed", top: bubblePos.top, left: bubblePos.left, transform: "translateX(-50%)", zIndex: 50 }}
                className="flex items-center gap-0.5 rounded-lg border bg-popover shadow-lg p-1"
                onMouseDown={(e) => e.preventDefault()}
              >
                {[
                  { mark: "bold", icon: <BoldIcon className="h-3.5 w-3.5" />, action: () => editor.chain().focus().toggleBold().run() },
                  { mark: "italic", icon: <ItalicIcon className="h-3.5 w-3.5" />, action: () => editor.chain().focus().toggleItalic().run() },
                  { mark: "code", icon: <CodeIcon className="h-3.5 w-3.5" />, action: () => editor.chain().focus().toggleCode().run() },
                  { mark: "highlight", icon: <HighlighterIcon className="h-3.5 w-3.5" />, action: () => editor.chain().focus().toggleHighlight().run() },
                ].map(({ mark, icon, action }) => (
                  <button
                    key={mark}
                    className={cn("flex items-center justify-center h-7 w-7 rounded transition-colors hover:bg-accent", editor.isActive(mark) && "bg-accent")}
                    onClick={action}
                  >{icon}</button>
                ))}
                <div className="w-px h-5 bg-border mx-0.5" />
                {([1, 2, 3] as const).map((level) => (
                  <button
                    key={level}
                    className={cn("flex items-center justify-center h-7 px-2 rounded text-xs font-bold transition-colors hover:bg-accent", editor.isActive("heading", { level }) && "bg-accent")}
                    onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                  >H{level}</button>
                ))}
              </div>
            )}

            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* Slash menu */}
      {slashOpen && slashPos && slashItems.length > 0 && (
        <div
          style={{ position: "fixed", top: slashPos.top, left: slashPos.left, zIndex: 100 }}
          className="bg-popover border rounded-xl shadow-xl overflow-hidden w-72"
        >
          <div className="p-1 max-h-80 overflow-y-auto">
            {slashItems.map((item, index) => (
              <button
                key={item.title}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors text-left",
                  index === slashIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                )}
                onMouseEnter={() => { slashIdxRef.current = index; setSlashIdx(index) }}
                onClick={() => {
                  if (suggestionRef.current)
                    item.command({ editor: suggestionRef.current.editor, range: suggestionRef.current.range })
                  setSlashOpen(false)
                }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">{item.icon}</div>
                <div>
                  <p className="font-medium leading-none">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete document"
        description={`This will permanently delete "${title || "Untitled"}". This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </>
  )
}
