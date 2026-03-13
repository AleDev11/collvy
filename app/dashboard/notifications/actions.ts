"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"

export async function getNotifications() {
  const session = await requireAuth()
  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  return notifications.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  }))
}

export async function markAllRead() {
  const session = await requireAuth()
  await db.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })
  revalidatePath("/dashboard")
}

export async function markRead(notificationId: string) {
  const session = await requireAuth()
  await db.notification.update({
    where: { id: notificationId, userId: session.user.id },
    data: { read: true },
  })
}

export async function deleteNotification(notificationId: string) {
  const session = await requireAuth()
  await db.notification.delete({
    where: { id: notificationId, userId: session.user.id },
  })
  revalidatePath("/dashboard")
}

// Internal helper used by other server actions to create notifications
export async function createNotification(
  userId: string,
  title: string,
  body: string,
  url?: string,
) {
  await db.notification.create({ data: { userId, title, body, url } })
}
