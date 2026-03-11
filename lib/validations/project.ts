import { z } from "zod/v4"

export const PROJECT_ICONS = [
  "folder", "kanban", "file-text", "calendar-days", "rocket",
  "star", "target", "zap", "lightbulb", "puzzle",
  "smartphone", "code-2", "database", "globe", "shield",
  "layers", "git-branch", "bar-chart-2", "users", "settings-2",
] as const

export type ProjectIcon = (typeof PROJECT_ICONS)[number]

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name is too long")
    .transform((v) => v.trim()),
  icon: z.enum(PROJECT_ICONS).default("folder"),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
