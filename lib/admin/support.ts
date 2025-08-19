import { prisma } from "@/lib/prisma"

export interface SupportTicket {
  id: string
  user: {
    name: string
    email: string
    avatar: string | null
  }
  workspace: {
    name: string
    plan: string
  }
  subject: string
  lastMessage: string
  status: string
  priority: string
  createdAt: string
  unreadCount: number
}

export interface ChatMessage {
  id: string
  sender: "user" | "admin"
  message: string
  timestamp: string
  user: {
    name: string
    avatar: string | null
  }
}

export async function getSupportTickets(searchQuery?: string): Promise<SupportTicket[]> {
  const whereClause = searchQuery
    ? {
        OR: [
          { subject: { contains: searchQuery, mode: "insensitive" as const } },
          { user: { name: { contains: searchQuery, mode: "insensitive" as const } } },
          { workspace: { name: { contains: searchQuery, mode: "insensitive" as const } } },
        ],
      }
    : {}

  const tickets = await prisma.supportTicket.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          name: true,
          email: true,
          avatar: true,
        },
      },
      workspace: {
        select: {
          name: true,
          subscription: {
            select: {
              plan: true,
            },
          },
        },
      },
      messages: {
        take: 1,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          content: true,
        },
      },
      _count: {
        select: {
          messages: {
            where: {
              isRead: false,
              sender: "USER",
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return tickets.map((ticket) => ({
    id: ticket.id,
    user: {
      name: ticket.user.name || "Unknown User",
      email: ticket.user.email,
      avatar: ticket.user.avatar,
    },
    workspace: {
      name: ticket.workspace?.name || "Personal",
      plan: ticket.workspace?.subscription?.plan || "FREE",
    },
    subject: ticket.subject,
    lastMessage: ticket.messages[0]?.content || "No messages yet",
    status: ticket.status.toLowerCase(),
    priority: ticket.priority.toLowerCase(),
    createdAt: formatTimeAgo(ticket.createdAt),
    unreadCount: ticket._count.messages,
  }))
}

export async function getChatMessages(ticketId: string): Promise<ChatMessage[]> {
  const messages = await prisma.supportMessage.findMany({
    where: {
      ticketId,
    },
    include: {
      user: {
        select: {
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  return messages.map((message) => ({
    id: message.id,
    sender: message.sender === "USER" ? "user" : "admin",
    message: message.content,
    timestamp: formatTimeAgo(message.createdAt),
    user: {
      name: message.user?.name || (message.sender === "ADMIN" ? "Support Agent" : "Unknown User"),
      avatar: message.user?.avatar,
    },
  }))
}

export async function getTicketInfo(ticketId: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          avatar: true,
        },
      },
      workspace: {
        select: {
          name: true,
          subscription: {
            select: {
              plan: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
  })

  if (!ticket) return null

  return {
    id: ticket.id,
    user: {
      name: ticket.user.name || "Unknown User",
      email: ticket.user.email,
      avatar: ticket.user.avatar,
    },
    workspace: {
      name: ticket.workspace?.name || "Personal",
      plan: ticket.workspace?.subscription?.plan || "FREE",
      members: ticket.workspace?._count.members || 1,
    },
    subject: ticket.subject,
    status: ticket.status.toLowerCase(),
    priority: ticket.priority.toLowerCase(),
    createdAt: ticket.createdAt.toISOString().split("T")[0],
    tags: ticket.tags || [],
  }
}

export async function sendSupportMessage(ticketId: string, content: string, senderId: string) {
  const message = await prisma.supportMessage.create({
    data: {
      ticketId,
      content,
      sender: "ADMIN",
      userId: senderId,
    },
  })

  // Update ticket's updatedAt timestamp
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { updatedAt: new Date() },
  })

  return message
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hours ago`

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} days ago`
}
