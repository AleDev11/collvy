import { Kanban, FileText, CalendarCheck, FolderOpen, Users, Code } from "lucide-react"

const features = [
  {
    icon: Kanban,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    title: "Kanban boards",
    badge: "Like Trello",
    description:
      "Drag-and-drop boards to organize tasks visually. Create columns, assign members, set priorities, and track progress from backlog to done.",
  },
  {
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Team docs",
    badge: "Like Notion",
    description:
      "Rich-text documents attached to any project. Meeting notes, specs, wikis — everything lives next to the work it belongs to.",
  },
  {
    icon: CalendarCheck,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    title: "Task planner",
    badge: "Like Planner",
    description:
      "Plan sprints and deadlines with a calendar view. Assign tasks, set due dates, and see who's working on what at a glance.",
  },
  {
    icon: FolderOpen,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "Projects",
    description:
      "Group boards and docs into projects. Each project is a self-contained workspace with its own tasks, docs, and timeline.",
  },
  {
    icon: Users,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "Workspaces & roles",
    description:
      "One workspace per company or team. Invite with a link, assign roles (owner, admin, member), and control access.",
  },
  {
    icon: Code,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    title: "Open source",
    description:
      "Fully open source under AGPL-3.0. Self-host on your own infra, contribute features, or use our managed cloud.",
  },
]

export function Features() {
  return (
    <section id="features" className="border-t bg-muted/30 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Replace your tool stack
          </h2>
          <p className="mt-4 text-muted-foreground">
            Boards, docs, and planner — one platform, one subscription.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${feature.bg}`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                {"badge" in feature && feature.badge && (
                  <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {feature.badge}
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
