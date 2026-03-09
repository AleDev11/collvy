# collvy

Open-source project management platform that combines **Kanban boards** (Trello), **team docs** (Notion), and **task planning** (Planner) into a single workspace.

## What is collvy?

Teams use too many disconnected tools — Trello for boards, Notion for docs, Planner for tasks. collvy unifies all three so your team works from one place.

### Core features

- **Kanban boards** — Drag-and-drop columns, task cards, priorities, assignees
- **Team docs** — Rich-text documents per project (specs, notes, wikis)
- **Task planner** — Calendar view with deadlines, assignments, and sprint planning
- **Projects** — Group boards + docs into self-contained projects
- **Workspaces** — One per team/company, invite via link, role-based access (owner/admin/member)

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| UI | shadcn/ui + Tailwind CSS 4 |
| Auth | NextAuth v5 (credentials + Google OAuth) |
| Database | SQLite (dev) via Prisma 7 + LibSQL adapter |
| Validation | Zod 4 |
| Runtime | Node.js |

## Getting started

```bash
# Clone
git clone https://github.com/AleDev11/collvy.git
cd collvy

# Install
bun install

# Setup database
cp .env.example .env
bunx prisma db push
bunx prisma generate

# Run
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
├── page.tsx                    # Landing page
├── dashboard/page.tsx          # Workspace home
├── (auth)/
│   ├── login/                  # Login page + action
│   ├── register/               # Register page + action
│   └── onboarding/
│       ├── page.tsx            # Choose create/join
│       ├── create/             # Create workspace
│       └── join/               # Join with invite code
└── api/auth/[...nextauth]/     # NextAuth API route

components/
├── landing/                    # Landing page sections
│   ├── header.tsx
│   ├── hero.tsx
│   ├── features.tsx
│   ├── pricing.tsx
│   └── footer.tsx
├── ui/                         # shadcn/ui components
└── theme-provider.tsx

lib/
├── auth.ts                     # NextAuth config
├── auth-guard.ts               # requireAuth() helper
├── db.ts                       # Prisma client singleton
├── rate-limit.ts               # In-memory rate limiter
├── utils.ts                    # cn() helper
└── validations/auth.ts         # Zod schemas

prisma/
└── schema.prisma               # User, Workspace, WorkspaceMember
```

## Roadmap

### Week 1 — Foundation (done)
- [x] Project setup (Next.js 16, Prisma, shadcn/ui)
- [x] Landing page (hero, features, pricing)
- [x] Auth (register, login, Google OAuth)
- [x] Onboarding (create/join workspace)
- [x] Security (rate limiting, input validation, security headers)

### Week 2 — Core product
- [ ] Dashboard with sidebar layout
- [ ] Workspace switcher
- [ ] Project CRUD
- [ ] Kanban boards (columns, tasks, drag-and-drop)

### Week 3 — Docs & Planner
- [ ] Rich-text editor for docs
- [ ] Docs per project
- [ ] Task planner with calendar view
- [ ] Due dates and assignees

### Week 4 — Polish
- [ ] Settings page
- [ ] Member management & invites
- [ ] Responsive design pass
- [ ] Deploy to production

## Security

- Passwords: bcrypt (12 rounds), min 8 chars + uppercase + lowercase + number
- Rate limiting: 5 attempts / 15 min on auth endpoints
- Generic error messages (no email enumeration)
- Email normalization (lowercase + trim)
- Security headers: X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy
- Server-side auth checks on all protected routes

## License

MIT
