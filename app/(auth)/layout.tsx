import type { Metadata } from "next"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-6 py-12">
      {/* Background blobs + grid */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-blob absolute -left-20 -top-20 h-80 w-80 rounded-full bg-purple-300/40 blur-3xl dark:bg-purple-600/25" />
        <div className="animate-blob animation-delay-2000 absolute right-0 top-1/3 h-72 w-72 rounded-full bg-blue-300/40 blur-3xl dark:bg-blue-600/25" />
        <div className="animate-blob animation-delay-4000 absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-300/35 blur-3xl dark:bg-emerald-600/20" />
        <div className="absolute inset-0 bg-grid" />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">C</span>
            </div>
            <span className="text-xl font-bold tracking-tight">collvy</span>
          </a>
        </div>
        {children}
      </div>
    </div>
  )
}
