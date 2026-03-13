"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { cn } from "@/lib/utils"
import { SearchIcon, FolderIcon, CheckSquareIcon, KanbanIcon, FileTextIcon, LoaderIcon } from "lucide-react"
import { globalSearch, type SearchResult } from "@/app/dashboard/search/actions"

const TYPE_ICON: Record<SearchResult["type"], React.FC<{ className?: string }>> = {
  project: FolderIcon,
  task: CheckSquareIcon,
  card: KanbanIcon,
  doc: FileTextIcon,
}

const TYPE_LABEL: Record<SearchResult["type"], string> = {
  project: "Project",
  task: "Task",
  card: "Card",
  doc: "Doc",
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const r = await globalSearch(query)
        setResults(r)
        setActiveIdx(0)
      })
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  function handleSelect(result: SearchResult) {
    setOpen(false)
    setQuery("")
    setResults([])
    router.push(result.url)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[activeIdx]) {
      handleSelect(results[activeIdx])
    }
  }

  function handleOpenChange(o: boolean) {
    setOpen(o)
    if (!o) { setQuery(""); setResults([]) }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 gap-0 overflow-hidden max-w-lg" onKeyDown={handleKeyDown}>
        <VisuallyHidden><DialogTitle>Search</DialogTitle></VisuallyHidden>

        {/* Input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {isPending
            ? <LoaderIcon className="h-4 w-4 shrink-0 text-muted-foreground animate-spin" />
            : <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          }
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, cards, docs, projects…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]) }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.length === 0 && !isPending && (
              <p className="text-center text-sm text-muted-foreground py-8">No results for &ldquo;{query}&rdquo;</p>
            )}
            {results.length > 0 && results.map((r, i) => {
              const Icon = TYPE_ICON[r.type]
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors",
                    i === activeIdx ? "bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{TYPE_LABEL[r.type]}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Empty state / hint */}
        {query.length < 2 && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
            <p className="text-xs text-muted-foreground/60 mt-1">↑↓ to navigate · Enter to open · Esc to close</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
