import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function Hero() {
  return (
    <section className="flex flex-col items-center px-6 pb-20 pt-24 text-center md:pt-32">
      <div className="mb-4 inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
        Now in early access
      </div>

      <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
        Your team&apos;s workspace,{" "}
        <span className="text-primary">all in one place</span>
      </h1>

      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Projects, chat, and calendar — unified in a single platform.
        Stop switching between tools and start shipping together.
      </p>

      <div className="mt-10 flex gap-4">
        <Button size="lg" asChild>
          <Link href="/register">
            Get started free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <a href="#features">See how it works</a>
        </Button>
      </div>
    </section>
  )
}
