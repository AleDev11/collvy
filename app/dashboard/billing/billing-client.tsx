"use client"

import { useState, useTransition } from "react"
import {
  CheckIcon, ZapIcon, BuildingIcon, CreditCardIcon,
  ExternalLinkIcon, AlertCircleIcon, SparklesIcon, ArrowRightIcon,
  UsersIcon, FolderIcon, ReceiptIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createCheckoutSession, createPortalSession } from "./actions"
import { PLAN_NAMES, PLAN_FEATURES, PLAN_PRICES, formatLimit, isUnlimited } from "@/lib/plans"
import type { PlanTier } from "@/lib/plans"
import type { STRIPE_PRICE_IDS } from "@/lib/plans"

type PriceKey = keyof typeof STRIPE_PRICE_IDS

type BillingProps = {
  tier: PlanTier
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: Date | null
  memberCount: number
  memberLimit: number
  projectCount: number
  projectLimit: number
  invoices: {
    id: string
    amount: number
    currency: string
    status: string
    invoiceUrl: string | null
    pdfUrl: string | null
    periodStart: Date
    periodEnd: Date
    createdAt: Date
  }[]
  stripeEnabled: boolean
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(d))
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100)
}

const TIER_STYLE: Record<PlanTier, { gradient: string; iconBg: string; border: string; icon: React.ElementType }> = {
  FREE:     { gradient: "from-slate-500 to-slate-600",   iconBg: "bg-slate-500/10",   border: "border-border",           icon: SparklesIcon },
  PRO:      { gradient: "from-violet-600 to-blue-600",   iconBg: "bg-violet-500/10",  border: "border-violet-500/20",    icon: ZapIcon },
  BUSINESS: { gradient: "from-orange-500 to-pink-600",   iconBg: "bg-orange-500/10",  border: "border-orange-500/20",    icon: BuildingIcon },
}

const UPGRADE_OPTIONS: { tier: Exclude<PlanTier, "FREE">; monthly: PriceKey; annual: PriceKey }[] = [
  { tier: "PRO",      monthly: "PRO_MONTHLY",      annual: "PRO_ANNUAL"       },
  { tier: "BUSINESS", monthly: "BUSINESS_MONTHLY", annual: "BUSINESS_ANNUAL"  },
]

function UsageBar({ current, limit, danger }: { current: number; limit: number; danger: boolean }) {
  const pct = isUnlimited(limit) ? 0 : Math.min((current / limit) * 100, 100)
  return (
    <div className="h-1 w-full rounded-full bg-border overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", danger ? "bg-red-500" : "bg-primary/60")}
        style={{ width: isUnlimited(limit) ? "4px" : `${pct}%` }}
      />
    </div>
  )
}

export function BillingClient({
  tier, status, cancelAtPeriodEnd, currentPeriodEnd,
  memberCount, memberLimit, projectCount, projectLimit,
  invoices, stripeEnabled,
}: BillingProps) {
  const [annual, setAnnual] = useState(true)
  const [pending, startTransition] = useTransition()

  const tierStyle = TIER_STYLE[tier]
  const TierIcon = tierStyle.icon

  const memberDanger  = !isUnlimited(memberLimit)  && memberCount  >= memberLimit
  const projectDanger = !isUnlimited(projectLimit) && projectCount >= projectLimit

  const statusLabel = status.toLowerCase().replace("_", " ")
  const statusColor = {
    ACTIVE:     "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
    TRIALING:   "text-blue-600 bg-blue-500/10 dark:text-blue-400",
    PAST_DUE:   "text-red-600 bg-red-500/10 dark:text-red-400",
    CANCELED:   "text-muted-foreground bg-muted",
    INCOMPLETE: "text-yellow-600 bg-yellow-500/10 dark:text-yellow-400",
  }[status] ?? "text-muted-foreground bg-muted"

  function upgrade(priceKey: PriceKey) {
    startTransition(async () => { await createCheckoutSession(priceKey) })
  }
  function managePortal() {
    startTransition(async () => { await createPortalSession() })
  }

  return (
    <div className="space-y-6">

      {/* ── Current plan ── */}
      <div className={cn("rounded-2xl border bg-card overflow-hidden", tierStyle.border)}>
        {/* Gradient top strip */}
        <div className={cn("h-1 w-full bg-linear-to-r", tierStyle.gradient)} />
        <div className="p-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", tierStyle.iconBg)}>
              <TierIcon className="h-6 w-6 text-foreground/70" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{PLAN_NAMES[tier]}</h2>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", statusColor)}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {tier === "FREE" && "Free plan · upgrade anytime"}
                {tier !== "FREE" && currentPeriodEnd && (
                  cancelAtPeriodEnd
                    ? `Cancels ${formatDate(currentPeriodEnd)}`
                    : `Renews ${formatDate(currentPeriodEnd)}`
                )}
                {tier !== "FREE" && !currentPeriodEnd && `$${PLAN_PRICES[tier].monthly}/mo`}
              </p>
            </div>
          </div>
          {tier !== "FREE" && stripeEnabled && (
            <button
              onClick={managePortal}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-xl border bg-background px-4 py-2 text-sm font-medium transition-all hover:bg-accent disabled:opacity-50 shadow-xs"
            >
              <CreditCardIcon className="h-3.5 w-3.5" />
              Manage billing
              <ExternalLinkIcon className="h-3 w-3 opacity-50" />
            </button>
          )}
        </div>
      </div>

      {/* ── Usage ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Members */}
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <UsersIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Members</span>
            </div>
            <span className={cn("text-sm font-semibold tabular-nums", memberDanger && "text-red-500")}>
              {memberCount}
              <span className="font-normal text-muted-foreground"> / {formatLimit(memberLimit)}</span>
            </span>
          </div>
          <UsageBar current={memberCount} limit={memberLimit} danger={memberDanger} />
          {memberDanger ? (
            <p className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
              <AlertCircleIcon className="h-3 w-3 shrink-0" />
              Limit reached — upgrade to add members
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isUnlimited(memberLimit) ? "Unlimited members on this plan" : `${memberLimit - memberCount} seats remaining`}
            </p>
          )}
        </div>

        {/* Projects */}
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FolderIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Projects</span>
            </div>
            <span className={cn("text-sm font-semibold tabular-nums", projectDanger && "text-red-500")}>
              {projectCount}
              <span className="font-normal text-muted-foreground"> / {formatLimit(projectLimit)}</span>
            </span>
          </div>
          <UsageBar current={projectCount} limit={projectLimit} danger={projectDanger} />
          {projectDanger ? (
            <p className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
              <AlertCircleIcon className="h-3 w-3 shrink-0" />
              Limit reached — upgrade to create projects
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isUnlimited(projectLimit) ? "Unlimited projects on this plan" : `${projectLimit - projectCount} projects remaining`}
            </p>
          )}
        </div>
      </div>

      {/* ── Upgrade ── */}
      {tier !== "BUSINESS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold">
              {tier === "FREE" ? "Upgrade your plan" : "Upgrade to Business"}
            </h3>
            <div className="inline-flex items-center rounded-full border bg-muted p-1">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-all",
                  !annual
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-all",
                  annual
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Annual
                <span className={cn("ml-1.5 text-[10px] font-semibold", annual ? "text-violet-500" : "text-muted-foreground")}>−25%</span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {UPGRADE_OPTIONS.filter((o) => tier === "FREE" || o.tier === "BUSINESS").map((option) => {
              const style = TIER_STYLE[option.tier]
              const Icon = style.icon
              const price = annual ? PLAN_PRICES[option.tier].annual : PLAN_PRICES[option.tier].monthly
              const priceKey = annual ? option.annual : option.monthly
              const isProHighlighted = option.tier === "PRO"

              return (
                <div
                  key={option.tier}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-card overflow-hidden transition-all",
                    isProHighlighted && "shadow-lg shadow-violet-500/10 border-violet-500/20 dark:shadow-violet-500/5"
                  )}
                >
                  {isProHighlighted && (
                    <div className="absolute -top-px left-6 right-6 h-px bg-linear-to-r from-transparent via-violet-500 to-transparent" />
                  )}
                  <div className={cn("h-0.5 w-full bg-linear-to-r", style.gradient)} />
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", style.iconBg)}>
                        <Icon className="h-4 w-4 text-foreground/70" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{PLAN_NAMES[option.tier]}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold">${price}</span>
                          <span className="text-xs text-muted-foreground">/mo</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {annual
                            ? `billed annually · $${price * 12}/yr`
                            : "billed monthly"}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-1.5 flex-1 mb-5">
                      {PLAN_FEATURES[option.tier].map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {stripeEnabled ? (
                      <button
                        onClick={() => upgrade(priceKey)}
                        disabled={pending}
                        className={cn(
                          "flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all disabled:opacity-50",
                          isProHighlighted
                            ? "bg-linear-to-r from-violet-600 to-blue-600 text-white hover:opacity-90 shadow-sm shadow-violet-500/25"
                            : "bg-linear-to-r from-orange-500 to-pink-600 text-white hover:opacity-90 shadow-sm shadow-orange-500/25"
                        )}
                      >
                        Upgrade to {PLAN_NAMES[option.tier]}
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <div className="rounded-xl border border-dashed p-3 text-center">
                        <p className="text-xs text-muted-foreground">Configure <code className="font-mono text-xs">STRIPE_SECRET_KEY</code> to enable payments</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Invoices ── */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Billing history</h3>
        </div>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <ReceiptIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No invoices yet</p>
            <p className="text-xs text-muted-foreground">Your billing history will appear here</p>
          </div>
        ) : (
          <div className="divide-y">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                    inv.status === "paid" ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" : "text-yellow-600 bg-yellow-500/10"
                  )}>
                    {inv.status}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{formatAmount(inv.amount, inv.currency)}</span>
                  <div className="flex items-center gap-1">
                    {inv.invoiceUrl && (
                      <a
                        href={inv.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="View invoice"
                      >
                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {inv.pdfUrl && (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
