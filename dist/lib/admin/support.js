"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupportTickets = getSupportTickets;
exports.getChatMessages = getChatMessages;
exports.getTicketInfo = getTicketInfo;
exports.sendSupportMessage = sendSupportMessage;
const firebase_1 = require("@/lib/firebase");
const firestore_1 = require("firebase/firestore");
async function getSupportTickets(searchQuery) {
    // Get support tickets from Firestore
    let ticketsQuery = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, "supportTickets"), (0, firestore_1.orderBy)("updatedAt", "desc"));
    const ticketsSnapshot = await (0, firestore_1.getDocs)(ticketsQuery);
    const tickets = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Filter by search query if provided (client-side filtering for simplicity)
    const filteredTickets = searchQuery
        ? tickets.filter(ticket => ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        : tickets;
    return filteredTickets.map((ticket) => ({
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
    }));
}
async function getChatMessages(ticketId) {
    const messagesQuery = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, "supportMessages"), (0, firestore_1.where)("ticketId", "==", ticketId), (0, firestore_1.orderBy)("createdAt", "asc"));
    const messagesSnapshot = await (0, firestore_1.getDocs)(messagesQuery);
    const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return messages.map((message) => ({
        id: message.id,
        sender: message.sender === "USER" ? "user" : "admin",
        message: message.content,
        timestamp: formatTimeAgo(message.createdAt?.toDate() || new Date()),
        user: {
            name: message.user?.name || (message.sender === "ADMIN" ? "Support Agent" : "Unknown User"),
            avatar: message.user?.avatar || null,
        },
    }));
}
async function getTicketInfo(ticketId) {
    const ticketDoc = await getDoc((0, firestore_1.doc)(firebase_1.db, "supportTickets", ticketId));
    const ticket = ticketDoc.data();
    if (!ticket)
        return null;
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
    };
}
async function sendSupportMessage(ticketId, content, senderId) {
    const messageData = {
        ticketId,
        content,
        sender: "ADMIN",
        userId: senderId,
        createdAt: new Date(),
    };
    const messageRef = await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, "supportMessages"), messageData);
    // Update ticket's updatedAt timestamp
    await (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, "supportTickets", ticketId), {
        updatedAt: new Date(),
    });
    return { id: messageRef.id, ...messageData };
}
function formatTimeAgo(date) {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1)
        return "Just now";
    if (diffInMinutes < 60)
        return `${diffInMinutes} minutes ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
        return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
}
