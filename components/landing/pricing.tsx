"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

const GITHUB_URL = "https://github.com/AleDev11/collvy"

const plans = [
  {
    name: "Self-hosted",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Open source, run it yourself",
    features: [
      { text: "Unlimited everything", included: true },
      { text: "Your own infrastructure", included: true },
      { text: "Full source code access", included: true },
      { text: "Boards, docs & planner", included: true },
      { text: "Community support", included: true },
      { text: "Automatic updates", included: false },
      { text: "Managed hosting", included: false },
      { text: "Priority support", included: false },
    ],
    cta: "View on GitHub",
    ctaHref: GITHUB_URL,
    variant: "outline" as const,
    external: true,
  },
  {
    name: "Pro",
    monthlyPrice: 8,
    yearlyPrice: 6,
    description: "Managed cloud, zero setup",
    features: [
      { text: "Up to 25 members", included: true },
      { text: "Unlimited projects & boards", included: true },
      { text: "Docs & task planner", included: true },
      { text: "10 GB storage", included: true },
      { text: "Admin panel & roles", included: true },
      { text: "Automatic updates", included: true },
      { text: "Managed hosting", included: true },
      { text: "Priority support", included: false },
    ],
    cta: "Start free trial",
    ctaHref: "/register",
    variant: "default" as const,
    highlighted: true,
  },
  {
    name: "Business",
    monthlyPrice: 15,
    yearlyPrice: 12,
    description: "For orgs that need full control",
    features: [
      { text: "Unlimited members", included: true },
      { text: "Unlimited projects & boards", included: true },
      { text: "Docs & task planner", included: true },
      { text: "100 GB storage", included: true },
      { text: "Admin panel, roles & audit logs", included: true },
      { text: "Automatic updates", included: true },
      { text: "Managed hosting", included: true },
      { text: "Priority support & SLA", included: true },
    ],
    cta: "Contact sales",
    ctaHref: "/register",
    variant: "outline" as const,
  },
]

export function Pricing() {
  const [annual, setAnnual] = useState(true)

  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Open source. Cloud optional.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Self-host for free or let us handle everything.
          </p>

          <div className="mt-8 inline-flex items-center rounded-full border bg-muted/50 p-1 text-sm">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "rounded-full px-4 py-1.5 transition-colors",
                !annual ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "rounded-full px-4 py-1.5 transition-colors",
                annual ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
              )}
            >
              Annual{" "}
              <span className="text-xs text-primary">save 20%+</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const price = annual ? plan.yearlyPrice : plan.monthlyPrice
            const isFree = price === 0

            return (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-xl border p-8",
                  plan.highlighted
                    ? "border-primary bg-card shadow-lg"
                    : "bg-card",
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most popular
                  </div>
                )}

                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

                <div className="mt-6 h-16">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {isFree ? "$0" : `$${price}`}
                    </span>
                    {!isFree && (
                      <span className="text-sm text-muted-foreground">/member/mo</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isFree && "Free forever — open source"}
                    {!isFree && annual && `billed annually ($${plan.monthlyPrice}/mo if monthly)`}
                    {!isFree && !annual && "billed monthly"}
                  </p>
                </div>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.text}
                      className={cn(
                        "flex items-center gap-3 text-sm",
                        !feature.included && "text-muted-foreground",
                      )}
                    >
                      {feature.included ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <X className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      )}
                      {feature.text}
                    </li>
                  ))}
                </ul>

                {"external" in plan && plan.external ? (
                  <Button className="mt-8 w-full" variant={plan.variant} asChild>
                    <a href={plan.ctaHref} target="_blank" rel="noopener noreferrer">
                      {plan.cta}
                    </a>
                  </Button>
                ) : (
                  <Button className="mt-8 w-full" variant={plan.variant} asChild>
                    <Link href={plan.ctaHref}>{plan.cta}</Link>
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
