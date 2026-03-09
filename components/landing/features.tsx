import { Kanban, MessageCircle, Calendar, Users, Shield, Zap } from "lucide-react"

const features = [
  {
    icon: Kanban,
    title: "Kanban boards",
    description: "Organize tasks visually with drag-and-drop boards. Track progress from backlog to done.",
  },
  {
    icon: MessageCircle,
    title: "Team chat",
    description: "Real-time messaging with channels and DMs. Keep conversations next to your work.",
  },
  {
    icon: Calendar,
    title: "Shared calendar",
    description: "Plan sprints, deadlines, and meetings in one view. Never miss a milestone.",
  },
  {
    icon: Users,
    title: "Workspaces",
    description: "Create separate workspaces for each team or company. Invite members with a single link.",
  },
  {
    icon: Shield,
    title: "Role-based access",
    description: "Owners, admins, and members — control who can do what across your workspace.",
  },
  {
    icon: Zap,
    title: "Built for speed",
    description: "Instant page loads and real-time updates. No spinners, no waiting.",
  },
]

export function Features() {
  return (
    <section id="features" className="border-t bg-muted/30 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything your team needs
          </h2>
          <p className="mt-4 text-muted-foreground">
            One platform to replace your scattered stack of tools.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
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
