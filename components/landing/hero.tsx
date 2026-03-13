import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function Hero() {
  return (
    <section className="relative flex flex-col items-center overflow-hidden px-6 pb-20 pt-24 text-center md:pt-32">
      {/* Background blobs + grid */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-blob absolute -left-16 -top-16 h-96 w-96 rounded-full bg-purple-300/40 blur-3xl dark:bg-purple-600/25" />
        <div className="animate-blob animation-delay-2000 absolute left-1/2 -top-8 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-300/40 blur-3xl dark:bg-blue-600/25" />
        <div className="animate-blob animation-delay-4000 absolute -right-16 top-8 h-80 w-80 rounded-full bg-emerald-300/35 blur-3xl dark:bg-emerald-600/20" />
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-background to-transparent" />
      </div>

      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200/60 bg-violet-50/80 px-4 py-1.5 text-xs text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
        </span>
        Open source — Boards + Docs + Planner
      </div>

      <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
        Trello, Notion &amp; Planner{" "}
        <span className="bg-linear-to-r from-violet-500 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
          unified
        </span>
      </h1>

      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Kanban boards, team docs, and task planning — all in one place.
        Open source and self-hostable.
      </p>

      <div className="mt-10 flex gap-4">
        <Button size="lg" className="bg-linear-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-blue-500 border-0" asChild>
          <Link href="/register">
            Start for free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <a href="#features">See features</a>
        </Button>
      </div>
    </section>
  )
}
