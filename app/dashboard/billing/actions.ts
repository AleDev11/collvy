"use server"

import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import { getActiveWorkspaceId, pickActiveMembership } from "@/lib/active-workspace"
import { STRIPE_PRICE_IDS } from "@/lib/plans"
import { redirect } from "next/navigation"

async function getCurrentWorkspace() {
  const session = await requireAuth()
  const memberships = await db.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  })
  if (memberships.length === 0) redirect("/onboarding")
  const activeId = await getActiveWorkspaceId()
  const membership = pickActiveMembership(memberships, activeId)
  return { session, workspace: membership.workspace, role: membership.role }
}

export async function createCheckoutSession(priceKey: keyof typeof STRIPE_PRICE_IDS) {
  if (!stripe) throw new Error("Stripe not configured")

  const { session, workspace } = await getCurrentWorkspace()
  const priceId = STRIPE_PRICE_IDS[priceKey]
  if (!priceId) throw new Error("Price ID not configured")

  const existing = await db.subscription.findUnique({ where: { workspaceId: workspace.id } })

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: existing?.stripeCustomerId ?? undefined,
    customer_email: existing?.stripeCustomerId ? undefined : session.user.email ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { workspaceId: workspace.id },
    success_url: `${process.env.AUTH_URL}/dashboard/billing?success=1`,
    cancel_url:  `${process.env.AUTH_URL}/dashboard/billing?canceled=1`,
  })

  if (!checkoutSession.url) throw new Error("No checkout URL")
  redirect(checkoutSession.url)
}

export async function createPortalSession() {
  if (!stripe) throw new Error("Stripe not configured")

  const { workspace } = await getCurrentWorkspace()
  const sub = await db.subscription.findUnique({ where: { workspaceId: workspace.id } })
  if (!sub?.stripeCustomerId) throw new Error("No Stripe customer")

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.AUTH_URL}/dashboard/billing`,
  })

  redirect(portalSession.url)
}
