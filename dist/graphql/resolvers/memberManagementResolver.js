import { prisma } from "../../lib/prisma.js";
import { UserInputError, ForbiddenError } from 'apollo-server-micro';
import { sendWorkspaceInvitationEmail } from "../../lib/email/index.js";
import crypto from 'crypto';
// Helper function to check if a user is an Admin or Owner of a workspace
const checkWorkspaceAdmin = async (workspaceId, userId, prismaClient) => {
    const member = await prismaClient.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
        include: { workspace: true, user: true }
    });
    if (!member || (member.role !== 'ADMIN' && member.role !== 'OWNER')) {
        throw new ForbiddenError('You are not authorized to perform this action in this workspace.');
    }
    return member;
};
// Helper function to check project/workspace admin rights
const checkProjectAdmin = async (projectId, userId, prismaClient) => {
    const project = await prismaClient.project.findUnique({ where: { id: projectId } });
    if (!project)
        throw new UserInputError("Project not found.");
    const projectMember = await prismaClient.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } }
    });
    // Project admin/owner has rights
    if (projectMember && (projectMember.role === 'ADMIN' || projectMember.role === 'OWNER')) {
        return;
    }
    // Workspace admin/owner also has rights
    await checkWorkspaceAdmin(project.workspaceId, userId, prisma);
};
export const memberManagementResolvers = {
    Query: {
        getWorkspaceInvitations: async (_, { workspaceId }, context) => {
            const userId = context.user?.id;
            if (!userId)
                throw new ForbiddenError("Authentication required.");
            // Any member of the workspace can see pending invitations
            const member = await prisma.workspaceMember.findUnique({
                where: { workspaceId_userId: { workspaceId, userId } }
            });
            if (!member)
                throw new ForbiddenError("You are not a member of this workspace.");
            return prisma.workspaceInvitation.findMany({
                where: { workspaceId, status: 'PENDING' },
                include: { invitedBy: true }
            });
        },
    },
    Mutation: {
        inviteWorkspaceMembers: async (_, { workspaceId, invitations }, context) => {
            const inviterId = context.user?.id;
            if (!inviterId)
                throw new ForbiddenError("Authentication required.");
            const inviterMember = await checkWorkspaceAdmin(workspaceId, inviterId, context.prisma);
            const inviterName = `${inviterMember.user.firstName || ''} ${inviterMember.user.lastName || ''}`.trim() || inviterMember.user.email;
            const createdInvitations = [];
            for (const invite of invitations) {
                const existingMember = await prisma.user.findFirst({
                    where: { email: invite.email, workspaceMembers: { some: { workspaceId } } }
                });
                if (existingMember)
                    continue; // Skip if already a member
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days
                const newInvitation = await prisma.workspaceInvitation.upsert({
                    where: { workspaceId_email: { workspaceId, email: invite.email } },
                    update: {
                        role: invite.role,
                        status: 'PENDING',
                        token: crypto.randomBytes(32).toString('hex'),
                        expiresAt,
                        invitedById: inviterId,
                    },
                    create: {
                        email: invite.email,
                        role: invite.role,
                        token: crypto.randomBytes(32).toString('hex'),
                        expiresAt,
                        workspaceId,
                        invitedById: inviterId,
                    },
                    include: {
                        invitedBy: true
                    }
                });
                await sendWorkspaceInvitationEmail({
                    to: newInvitation.email,
                    inviterName,
                    workspaceName: inviterMember.workspace.name,
                    token: newInvitation.token,
                });
                createdInvitations.push(newInvitation);
            }
            return createdInvitations;
        },
        acceptWorkspaceInvitation: async (_, { token }, context) => {
            const userId = context.user?.id;
            const userEmail = context.user?.email;
            if (!userId || !userEmail) {
                throw new ForbiddenError("Authentication required. Please log in or register.");
            }
            const invitation = await prisma.workspaceInvitation.findUnique({ where: { token } });
            if (!invitation) {
                throw new UserInputError("This invitation is invalid or has expired.");
            }
            const now = new Date();
            const isExpired = now > invitation.expiresAt;
            const isPending = invitation.status === 'PENDING';
            if (!isPending || isExpired) {
                throw new UserInputError("This invitation is invalid or has expired.");
            }
            if (invitation.email !== userEmail) {
                throw new ForbiddenError("This invitation is intended for another email address.");
            }
            return prisma.$transaction(async (tx) => {
                const newMember = await tx.workspaceMember.create({
                    data: {
                        userId,
                        workspaceId: invitation.workspaceId,
                        role: invitation.role,
                    },
                });
                await tx.workspaceInvitation.update({
                    where: { id: invitation.id },
                    data: { status: 'ACCEPTED' },
                });
                return newMember;
            });
        },
        revokeWorkspaceInvitation: async (_, { invitationId }, context) => {
            const userId = context.user?.id;
            if (!userId)
                throw new ForbiddenError("Authentication required.");
            const invitation = await prisma.workspaceInvitation.findUnique({ where: { id: invitationId } });
            if (!invitation)
                throw new UserInputError("Invitation not found.");
            await checkWorkspaceAdmin(invitation.workspaceId, userId, context.prisma);
            return prisma.workspaceInvitation.delete({ where: { id: invitationId } });
        },
        updateWorkspaceMemberRole: async (_, { memberId, role }, context) => {
            const userId = context.user?.id;
            if (!userId)
                throw new ForbiddenError("Authentication required.");
            const memberToUpdate = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
            if (!memberToUpdate)
                throw new UserInputError("Member not found.");
            await checkWorkspaceAdmin(memberToUpdate.workspaceId, userId, context.prisma);
            if (memberToUpdate.role === 'OWNER')
                throw new ForbiddenError("Cannot change the role of the workspace owner.");
            if (role === 'OWNER')
                throw new ForbiddenError("Cannot assign OWNER role. Transfer ownership instead.");
            return prisma.workspaceMember.update({
                where: { id: memberId },
                data: { role },
            });
        },
        removeWorkspaceMembers: async (_, { memberIds }, context) => {
            const userId = context.user?.id;
            if (!userId)
                throw new ForbiddenError("Authentication required.");
            const membersToRemove = await prisma.workspaceMember.findMany({ where: { id: { in: memberIds } } });
            if (membersToRemove.length === 0)
                return [];
            const workspaceId = membersToRemove[0].workspaceId;
            await checkWorkspaceAdmin(workspaceId, userId, context.prisma);
            const validMemberIdsToRemove = membersToRemove
                .filter(member => member.role !== 'OWNER')
                .map(member => member.id);
            await prisma.workspaceMember.deleteMany({
                where: { id: { in: validMemberIdsToRemove } }
            });
            return membersToRemove.filter(member => member.role !== 'OWNER');
        },
        addProjectMembers: async (_, { projectId, members }, context) => {
            const currentUserId = context.user?.id;
            if (!currentUserId)
                throw new ForbiddenError("Authentication required.");
            await checkProjectAdmin(projectId, currentUserId, context.prisma);
            const dataToCreate = members.map(m => ({
                projectId,
                userId: m.userId,
                role: m.role,
            }));
            // This will skip any duplicates (user already in project)
            await prisma.projectMember.createMany({
                data: dataToCreate,
                skipDuplicates: true,
            });
            // Fetch and return the newly created members
            return prisma.projectMember.findMany({
                where: {
                    projectId,
                    userId: { in: members.map(m => m.userId) }
                },
                include: {
                    user: {
                        select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true, email: true }
                    }
                }
            });
        },
        updateProjectMemberRole: async (_, { memberId, role }, context) => {
            const userId = context.user?.id;
            if (!userId)
                throw new ForbiddenError("Authentication required.");
            const memberToUpdate = await prisma.projectMember.findUnique({ where: { id: memberId } });
            if (!memberToUpdate)
                throw new UserInputError("Project member not found.");
            await checkProjectAdmin(memberToUpdate.projectId, userId, context.prisma);
            if (memberToUpdate.role === 'OWNER')
                throw new ForbiddenError("Cannot change the role of the project owner.");
            if (role === 'OWNER')
                throw new ForbiddenError("Cannot assign OWNER role.");
            return prisma.projectMember.update({
                where: { id: memberId },
                data: { role },
            });
        },
        removeProjectMembers: async (_, { memberIds }, context) => {
            const userId = context.user?.id;
            if (!userId)
                throw new ForbiddenError("Authentication required.");
            const membersToRemove = await prisma.projectMember.findMany({ where: { id: { in: memberIds } } });
            if (membersToRemove.length === 0)
                return [];
            const projectId = membersToRemove[0].projectId;
            await checkProjectAdmin(projectId, userId, context.prisma);
            const validMemberIdsToRemove = membersToRemove
                .filter(member => member.role !== 'OWNER')
                .map(member => member.id);
            await prisma.projectMember.deleteMany({
                where: { id: { in: validMemberIdsToRemove } }
            });
            return membersToRemove.filter(member => member.role !== 'OWNER');
        },
    },
};
