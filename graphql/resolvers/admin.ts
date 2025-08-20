import {
  getDashboardMetrics,
  getUserGrowthData,
  getSubscriptionData,
  getContentCreationData,
  getRecentActivity,
} from "@/lib/admin/analytics"
import { getSupportTickets, getChatMessages, getTicketInfo, sendSupportMessage } from "@/lib/admin/support"
import { requireAdmin } from "@/lib/admin/auth"


export const adminResolvers = {
  Query: {
    adminDashboardMetrics: async (_: any, __: any, context: any) => {
      requireAdmin(context)
      return await getDashboardMetrics()
    },

    adminUserGrowthData: async (_: any, __: any, context: any) => {
      requireAdmin(context)
      return await getUserGrowthData()
    },

    adminSubscriptionData: async (_: any, __: any, context: any) => {
      requireAdmin(context)
      return await getSubscriptionData()
    },

    adminContentCreationData: async (_: any, __: any, context: any) => {
      requireAdmin(context)
      return await getContentCreationData()
    },

    adminRecentActivity: async (_: any, __: any, context: any) => {
      requireAdmin(context)
      return await getRecentActivity()
    },

    adminSupportTickets: async (_: any, { searchQuery }: { searchQuery?: string }, context: any) => {
      requireAdmin(context)
      return await getSupportTickets(searchQuery)
    },

    adminChatMessages: async (_: any, { ticketId }: { ticketId: string }, context: any) => {
      requireAdmin(context)
      return await getChatMessages(ticketId)
    },

    adminTicketInfo: async (_: any, { ticketId }: { ticketId: string }, context: any) => {
      requireAdmin(context)
      return await getTicketInfo(ticketId)
    },
  },

  Mutation: {
    adminSendSupportMessage: async (
      _: any,
      { ticketId, content }: { ticketId: string; content: string },
      context: any,
    ) => {
      requireAdmin(context)
      return await sendSupportMessage(ticketId, content, context.user.id)
    },
  },
}
