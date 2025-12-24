import { addDays, subHours } from "date-fns";
export const MOCK_USERS = [
    { id: "u1", firstName: "Alex", lastName: "Rivera", email: "alex@company.com", avatar: "", avatarColor: "#3b82f6", role: "ADMIN" },
    { id: "u2", firstName: "Sarah", lastName: "Chen", email: "sarah@company.com", avatar: "", avatarColor: "#ec4899", role: "MEMBER" },
    { id: "u3", firstName: "Mike", lastName: "Johnson", email: "mike@client.com", avatar: "", avatarColor: "#f59e0b", role: "GUEST" },
    { id: "u4", firstName: "Emily", lastName: "Davis", email: "emily@client.com", avatar: "", avatarColor: "#10b981", role: "GUEST" },
];
export const MOCK_PROJECTS = [
    {
        id: "p1",
        name: "Website Redesign",
        description: "Overhaul of the main marketing site",
        members: [MOCK_USERS[0], MOCK_USERS[1], MOCK_USERS[2]]
    },
    {
        id: "p2",
        name: "Mobile App Beta",
        description: "iOS and Android launch prep",
        members: [MOCK_USERS[0], MOCK_USERS[3]]
    }
];
export const MOCK_FEED_POSTS = [
    {
        id: "post1",
        author: MOCK_USERS[0],
        content: "🚀 We have officially deployed the new landing page to staging! Please review specifically the mobile responsiveness on the pricing section.",
        type: "RELEASE",
        createdAt: subHours(new Date(), 2).toISOString(),
        comments: [
            { id: "c1", author: MOCK_USERS[2], content: "Looks great! Found one small alignment issue on iPhone 13.", createdAt: subHours(new Date(), 1).toISOString() }
        ]
    },
    {
        id: "post2",
        author: MOCK_USERS[1],
        content: "Update: The API rate limiting logic has been refactored. This should solve the latency issues reported last week.",
        type: "FEATURE",
        createdAt: subHours(new Date(), 24).toISOString(),
        comments: []
    }
];
export const MOCK_TICKETS = [
    {
        id: "t1",
        subject: "Login page 404 error",
        priority: "HIGH",
        status: "OPEN",
        creator: MOCK_USERS[2],
        messages: [],
        createdAt: subHours(new Date(), 5).toISOString(),
        updatedAt: subHours(new Date(), 1).toISOString(),
        type: "ticket",
        participantInfo: "Mike Johnson",
        lastMessage: "I cannot access the dashboard.",
        unreadCount: 2
    },
    {
        id: "t2",
        subject: "Feature Request: Dark Mode",
        priority: "LOW",
        status: "IN_PROGRESS",
        creator: MOCK_USERS[3],
        messages: [],
        createdAt: addDays(new Date(), -2).toISOString(),
        updatedAt: addDays(new Date(), -1).toISOString(),
        type: "ticket",
        participantInfo: "Emily Davis",
        lastMessage: "Any update on this?",
        unreadCount: 0
    }
];
export const MOCK_CONVERSATIONS = [
    {
        id: "conv1",
        type: "conversation",
        conversationType: "DIRECT",
        title: "Sarah Chen",
        participantInfo: "Sarah Chen",
        participants: [MOCK_USERS[0], MOCK_USERS[1]],
        lastMessage: "Did you see the client feedback?",
        updatedAt: subHours(new Date(), 0.5).toISOString(),
        unreadCount: 1,
        messages: []
    }
];
