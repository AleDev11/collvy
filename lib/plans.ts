export type PlanTier = "FREE" | "PRO" | "BUSINESS"

export const PLAN_LIMITS: Record<PlanTier, { members: number; projects: number }> = {
  FREE:     { members: 3,  projects: 3  },
  PRO:      { members: 25, projects: -1 },  // -1 = unlimited
  BUSINESS: { members: -1, projects: -1 },
}

export const PLAN_PRICES: Record<PlanTier, { monthly: number; annual: number }> = {
  FREE:     { monthly: 0,  annual: 0  },
  PRO:      { monthly: 8,  annual: 6  },
  BUSINESS: { monthly: 15, annual: 12 },
}

export const PLAN_NAMES: Record<PlanTier, string> = {
  FREE:     "Free",
  PRO:      "Pro",
  BUSINESS: "Business",
}

export const PLAN_FEATURES: Record<PlanTier, string[]> = {
  FREE:     ["3 members", "3 projects", "Kanban, docs & planner", "Community support"],
  PRO:      ["Up to 25 members", "Unlimited projects", "Kanban, docs & planner", "10 GB storage", "Managed hosting & updates"],
  BUSINESS: ["Unlimited members", "Unlimited projects", "Kanban, docs & planner", "100 GB storage", "Priority support & SLA"],
}

export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY:      process.env.STRIPE_PRICE_PRO_MONTHLY      ?? "",
  PRO_ANNUAL:       process.env.STRIPE_PRICE_PRO_ANNUAL       ?? "",
  BUSINESS_MONTHLY: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? "",
  BUSINESS_ANNUAL:  process.env.STRIPE_PRICE_BUSINESS_ANNUAL  ?? "",
}

export function isUnlimited(n: number) {
  return n === -1
}

export function formatLimit(n: number) {
  return n === -1 ? "Unlimited" : String(n)
}
