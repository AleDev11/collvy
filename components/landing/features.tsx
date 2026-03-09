import { Kanban, FileText, CalendarCheck, FolderOpen, Users, Code } from "lucide-react"

const features = [
  {
    icon: Kanban,
    title: "Kanban boards",
    badge: "Like Trello",
    description:
      "Drag-and-drop boards to organize tasks visually. Create columns, assign members, set priorities, and track progress from backlog to done.",
  },
  {
    icon: FileText,
    title: "Team docs",
    badge: "Like Notion",
    description:
      "Rich-text documents attached to any project. Meeting notes, specs, wikis — everything lives next to the work it belongs to.",
  },
  {
    icon: CalendarCheck,
    title: "Task planner",
    badge: "Like Planner",
    description:
      "Plan sprints and deadlines with a calendar view. Assign tasks, set due dates, and see who's working on what at a glance.",
  },
  {
    icon: FolderOpen,
    title: "Projects",
    description:
      "Group boards and docs into projects. Each project is a self-contained workspace with its own tasks, docs, and timeline.",
  },
  {
    icon: Users,
    title: "Workspaces & roles",
    description:
      "One workspace per company or team. Invite with a link, assign roles (owner, admin, member), and control access.",
  },
  {
    icon: Code,
    title: "Open source",
    description:
      "Fully open source under MIT. Self-host on your own infra, contribute features, or use our managed cloud.",
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
              className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                {"badge" in feature && feature.badge && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
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
