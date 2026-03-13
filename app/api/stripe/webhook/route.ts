import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/db"
import type Stripe from "stripe"

export const runtime = "nodejs"

function subPeriod(s: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = s as any
  const start = raw?.current_period_start ?? raw?.items?.data?.[0]?.current_period_start
  const end   = raw?.current_period_end   ?? raw?.items?.data?.[0]?.current_period_end
  return {
    currentPeriodStart: start ? new Date(start * 1000) : null,
    currentPeriodEnd:   end   ? new Date(end   * 1000) : null,
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!stripe || !session.metadata?.workspaceId || !session.subscription) return
  const workspaceId = session.metadata.workspaceId
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
  const price = subscription.items.data[0]?.price
  const tier = (price?.metadata?.tier ?? "PRO") as "PRO" | "BUSINESS"
  const period = subPeriod(subscription)
  const upsertData = {
    tier, status: "ACTIVE" as const,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: price?.id,
    ...period,
  }
  await db.subscription.upsert({ where: { workspaceId }, create: { workspaceId, ...upsertData }, update: upsertData })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInvoicePaid(invoice: any) {
  if (!stripe) return
  const sub = await db.subscription.findFirst({ where: { stripeCustomerId: invoice.customer } })
  if (!sub) return
  const line = invoice.lines?.data?.[0]
  await db.invoice.create({
    data: {
      workspaceId:     sub.workspaceId,
      stripeInvoiceId: invoice.id,
      amount:          invoice.amount_paid,
      currency:        invoice.currency,
      status:          "paid",
      invoiceUrl:      invoice.hosted_invoice_url ?? null,
      pdfUrl:          invoice.invoice_pdf        ?? null,
      periodStart:     line?.period?.start ? new Date(line.period.start * 1000) : new Date(),
      periodEnd:       line?.period?.end   ? new Date(line.period.end   * 1000) : new Date(),
    },
  })
  if (invoice.subscription) {
    const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription)
    await db.subscription.update({
      where: { workspaceId: sub.workspaceId },
      data: { status: "ACTIVE", ...subPeriod(stripeSub) },
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionUpdated(subscription: any) {
  const sub = await db.subscription.findFirst({ where: { stripeSubscriptionId: subscription.id } })
  if (!sub) return
  const price = subscription.items?.data?.[0]?.price
  await db.subscription.update({
    where: { workspaceId: sub.workspaceId },
    data: {
      tier:              (price?.metadata?.tier ?? sub.tier) as "FREE" | "PRO" | "BUSINESS",
      status:            (subscription.status as string).toUpperCase() as "ACTIVE" | "CANCELED" | "PAST_DUE",
      stripePriceId:     price?.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      ...subPeriod(subscription),
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionDeleted(subscription: any) {
  const sub = await db.subscription.findFirst({ where: { stripeSubscriptionId: subscription.id } })
  if (!sub) return
  await db.subscription.update({
    where: { workspaceId: sub.workspaceId },
    data: { tier: "FREE", status: "CANCELED", stripeSubscriptionId: null, cancelAtPeriodEnd: false },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentFailed(invoice: any) {
  const sub = await db.subscription.findFirst({ where: { stripeCustomerId: invoice.customer } })
  if (!sub) return
  await db.subscription.update({ where: { workspaceId: sub.workspaceId }, data: { status: "PAST_DUE" } })
}

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 })
  }

  const body = await req.text()
  const sig = req.headers.get("stripe-signature")
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    if (event.type === "checkout.session.completed")    await handleCheckoutCompleted(event.data.object)
    if (event.type === "invoice.paid")                  await handleInvoicePaid(event.data.object)
    if (event.type === "invoice.payment_failed")        await handlePaymentFailed(event.data.object)
    if (event.type === "customer.subscription.updated") await handleSubscriptionUpdated(event.data.object)
    if (event.type === "customer.subscription.deleted") await handleSubscriptionDeleted(event.data.object)
  } catch (err) {
    console.error("[stripe webhook]", err)
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
