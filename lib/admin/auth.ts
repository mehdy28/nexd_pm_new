import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function requireAdmin(context?: any) {
  let user = context?.user

  if (!user) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error("Authentication required")
    }
    user = session.user
  }

  if (user.role !== "ADMIN") {
    throw new Error("Admin access required")
  }

  return user
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  return user?.role === "ADMIN"
}

export async function promoteUserToAdmin(userId: string, promotedBy: string) {
  const promoter = await prisma.user.findUnique({
    where: { id: promotedBy },
    select: { role: true },
  })

  if (promoter?.role !== "ADMIN") {
    throw new Error("Only admins can promote users")
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: "ADMIN" },
  })

  // Log the promotion
  await prisma.activity.create({
    data: {
      action: "PROMOTED_TO_ADMIN",
      entityType: "USER",
      entityId: userId,
      userId: promotedBy,
      metadata: {
        targetUserId: userId,
        promotedBy: promotedBy,
      },
    },
  })

  return updatedUser
}

export async function demoteAdminUser(userId: string, demotedBy: string) {
  const demoter = await prisma.user.findUnique({
    where: { id: demotedBy },
    select: { role: true },
  })

  if (demoter?.role !== "ADMIN") {
    throw new Error("Only admins can demote users")
  }

  // Prevent self-demotion
  if (userId === demotedBy) {
    throw new Error("Cannot demote yourself")
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: "USER" },
  })

  // Log the demotion
  await prisma.activity.create({
    data: {
      action: "DEMOTED_FROM_ADMIN",
      entityType: "USER",
      entityId: userId,
      userId: demotedBy,
      metadata: {
        targetUserId: userId,
        demotedBy: demotedBy,
      },
    },
  })

  return updatedUser
}
