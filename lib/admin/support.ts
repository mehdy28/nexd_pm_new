import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, limit, addDoc, updateDoc, doc } from "firebase/firestore"

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
  // Get support tickets from Firestore
  let ticketsQuery = query(
    collection(db, "supportTickets"),
    orderBy("updatedAt", "desc")
  )
  
  const ticketsSnapshot = await getDocs(ticketsQuery)
  const tickets = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  // Filter by search query if provided (client-side filtering for simplicity)
  const filteredTickets = searchQuery 
    ? tickets.filter(ticket => 
        ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tickets

  return filteredTickets.map((ticket: any) => ({
    id: ticket.id,
    user: {
      name: ticket.user?.name || "Unknown User",
      email: ticket.user?.email || "",
      avatar: ticket.user?.avatar || null,
    },
    workspace: {
      name: ticket.workspace?.name || "Personal",
      plan: ticket.workspace?.plan || "FREE",
    },
    subject: ticket.subject,
    lastMessage: ticket.lastMessage || "No messages yet",
    status: ticket.status?.toLowerCase() || "open",
    priority: ticket.priority?.toLowerCase() || "medium",
    createdAt: formatTimeAgo(ticket.createdAt?.toDate() || new Date()),
    unreadCount: ticket.unreadCount || 0,
  }))
}

export async function getChatMessages(ticketId: string): Promise<ChatMessage[]> {
  const messagesQuery = query(
    collection(db, "supportMessages"),
    where("ticketId", "==", ticketId),
    orderBy("createdAt", "asc")
  )
  const messagesSnapshot = await getDocs(messagesQuery)
  const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  return messages.map((message: any) => ({
    id: message.id,
    sender: message.sender === "USER" ? "user" : "admin",
    message: message.content,
    timestamp: formatTimeAgo(message.createdAt?.toDate() || new Date()),
    user: {
      name: message.user?.name || (message.sender === "ADMIN" ? "Support Agent" : "Unknown User"),
      avatar: message.user?.avatar || null,
    },
  }))
}

export async function getTicketInfo(ticketId: string) {
  const ticketDoc = await getDoc(doc(db, "supportTickets", ticketId))
  const ticket = ticketDoc.data()

  if (!ticket) return null

  return {
    id: ticketId,
    user: {
      name: ticket.user?.name || "Unknown User",
      email: ticket.user?.email || "",
      avatar: ticket.user?.avatar || null,
    },
    workspace: {
      name: ticket.workspace?.name || "Personal",
      plan: ticket.workspace?.plan || "FREE",
      members: ticket.workspace?.members || 1,
    },
    subject: ticket.subject,
    status: ticket.status?.toLowerCase() || "open",
    priority: ticket.priority?.toLowerCase() || "medium",
    createdAt: ticket.createdAt?.toDate().toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
    tags: ticket.tags || [],
  }
}

export async function sendSupportMessage(ticketId: string, content: string, senderId: string) {
  const messageData = {
    ticketId,
    content,
    sender: "ADMIN",
    userId: senderId,
    createdAt: new Date(),
  }
  
  const messageRef = await addDoc(collection(db, "supportMessages"), messageData)

  // Update ticket's updatedAt timestamp
  await updateDoc(doc(db, "supportTickets", ticketId), {
    updatedAt: new Date(),
  })

  return { id: messageRef.id, ...messageData }
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
