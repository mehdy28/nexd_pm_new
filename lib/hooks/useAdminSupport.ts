import { useQuery, useMutation } from "@apollo/client"
import { gql } from "@apollo/client"

const GET_SUPPORT_TICKETS = gql`
  query GetAdminSupportTickets($searchQuery: String) {
    adminSupportTickets(searchQuery: $searchQuery) {
      id
      user {
        name
        email
        avatar
      }
      workspace {
        name
        plan
      }
      subject
      lastMessage
      status
      priority
      createdAt
      unreadCount
    }
  }
`

const GET_CHAT_MESSAGES = gql`
  query GetAdminChatMessages($ticketId: String!) {
    adminChatMessages(ticketId: $ticketId) {
      id
      sender
      message
      timestamp
      user {
        name
        avatar
      }
    }
  }
`

const GET_TICKET_INFO = gql`
  query GetAdminTicketInfo($ticketId: String!) {
    adminTicketInfo(ticketId: $ticketId) {
      id
      user {
        name
        email
        avatar
      }
      workspace {
        name
        plan
        members
      }
      subject
      status
      priority
      createdAt
      tags
    }
  }
`

const SEND_SUPPORT_MESSAGE = gql`
  mutation AdminSendSupportMessage($ticketId: String!, $content: String!) {
    adminSendSupportMessage(ticketId: $ticketId, content: $content) {
      id
      content
      createdAt
    }
  }
`

export function useAdminSupportTickets(searchQuery?: string) {
  const { data, loading, error, refetch } = useQuery(GET_SUPPORT_TICKETS, {
    variables: { searchQuery },
  })

  return {
    tickets: data?.adminSupportTickets || [],
    loading,
    error,
    refetch,
  }
}

export function useAdminChatMessages(ticketId: string) {
  const { data, loading, error } = useQuery(GET_CHAT_MESSAGES, {
    variables: { ticketId },
    skip: !ticketId,
  })

  return {
    messages: data?.adminChatMessages || [],
    loading,
    error,
  }
}

export function useAdminTicketInfo(ticketId: string) {
  const { data, loading, error } = useQuery(GET_TICKET_INFO, {
    variables: { ticketId },
    skip: !ticketId,
  })

  return {
    ticketInfo: data?.adminTicketInfo,
    loading,
    error,
  }
}

export function useAdminSendMessage() {
  const [sendMessage, { loading, error }] = useMutation(SEND_SUPPORT_MESSAGE)

  return {
    sendMessage: (ticketId: string, content: string) =>
      sendMessage({
        variables: { ticketId, content },
        refetchQueries: [GET_CHAT_MESSAGES],
      }),
    loading,
    error,
  }
}
