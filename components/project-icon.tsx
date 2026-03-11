import {
  FolderIcon,
  KanbanIcon,
  FileTextIcon,
  CalendarDaysIcon,
  RocketIcon,
  StarIcon,
  TargetIcon,
  ZapIcon,
  LightbulbIcon,
  PuzzleIcon,
  SmartphoneIcon,
  Code2Icon,
  DatabaseIcon,
  GlobeIcon,
  ShieldIcon,
  LayersIcon,
  GitBranchIcon,
  BarChart2Icon,
  UsersIcon,
  Settings2Icon,
  type LucideProps,
} from "lucide-react"
import type { ProjectIcon } from "@/lib/validations/project"

const ICON_MAP: Record<ProjectIcon, React.ComponentType<LucideProps>> = {
  folder: FolderIcon,
  kanban: KanbanIcon,
  "file-text": FileTextIcon,
  "calendar-days": CalendarDaysIcon,
  rocket: RocketIcon,
  star: StarIcon,
  target: TargetIcon,
  zap: ZapIcon,
  lightbulb: LightbulbIcon,
  puzzle: PuzzleIcon,
  smartphone: SmartphoneIcon,
  "code-2": Code2Icon,
  database: DatabaseIcon,
  globe: GlobeIcon,
  shield: ShieldIcon,
  layers: LayersIcon,
  "git-branch": GitBranchIcon,
  "bar-chart-2": BarChart2Icon,
  users: UsersIcon,
  "settings-2": Settings2Icon,
}

export function ProjectIcon({
  icon,
  ...props
}: LucideProps & { icon: string }) {
  const Icon = ICON_MAP[icon as ProjectIcon] ?? FolderIcon
  return <Icon {...props} />
}
