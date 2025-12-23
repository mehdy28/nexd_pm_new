import { prisma } from "@/lib/prisma";
import { DecodedIdToken, getAuth as getAdminAuth } from "firebase-admin/auth";
import { UserInputError, ForbiddenError } from "apollo-server-micro";
import { getRandomAvatarColor } from "@/lib/avatar-colors";
import { sendEmailConfirmationEmail, sendPasswordResetEmail } from "@/lib/email";
import crypto from 'crypto';

interface GraphQLContext {
  prisma: typeof prisma;
  user?: {
    id: string;
    email: string;
    role: string;
    firebaseUid: string;
  };
  decodedToken?: DecodedIdToken | null;
}



export const userResolver = {
  Query: {
    me: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      if (!context.user?.id) {
        return null;
      }
      try {
        const user = await prisma.user.findUnique({
          where: { id: context.user.id },
          include: {
            ownedWorkspaces: { select: { id: true, name: true } },
            workspaceMembers: { select: { workspace: { select: { id: true } } } },
          },
        });
        return user;
      } catch (error) {
        throw new Error("Failed to fetch user profile.");
      }
    },
  },

  Mutation: {
    requestPasswordReset: async (_parent: unknown, { email }: { email: string }) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return true; 

      const actionCodeSettings = {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      };

      // This generates the Firebase handler link
      const firebaseLink = await getAdminAuth().generatePasswordResetLink(email, actionCodeSettings);
      
      // Extract the oobCode from the generated link
      const urlParams = new URL(firebaseLink).searchParams;
      const oobCode = urlParams.get('oobCode');

      // Construct your custom app link
      const customResetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?oobCode=${oobCode}`;
      
      await sendPasswordResetEmail({
        to: email,
        firstName: user.firstName || "User",
        resetLink: customResetLink,
      });

      return true;
    },

    createUser: async (
      _parent: unknown,
      args: {
        email: string;
        firstName?: string;
        lastName?: string;
        role?: "ADMIN" | "MEMBER";
        invitationToken?: string;
      },
      context: GraphQLContext
    ) => {

      const firebaseUid = context.decodedToken?.uid;
      if (!firebaseUid) {
        throw new ForbiddenError("Authentication token is invalid or missing.");
      }

      const avatarColor = getRandomAvatarColor();
      const verificationToken = crypto.randomBytes(32).toString('hex');

      if (args.invitationToken) {
        const invitation = await prisma.workspaceInvitation.findUnique({
          where: { token: args.invitationToken },
        });

        if (!invitation) throw new UserInputError("This invitation is invalid.");
        if (invitation.status !== 'PENDING') throw new UserInputError("This invitation has already been used or revoked.");
        if (new Date() > invitation.expiresAt) throw new UserInputError("This invitation has expired.");
        if (invitation.email.toLowerCase() !== args.email.toLowerCase()) throw new ForbiddenError("This invitation is for a different email address.");

        try {
          const newUser = await prisma.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
              data: {
                email: args.email,
                firstName: args.firstName,
                lastName: args.lastName,
                avatarColor: avatarColor,
                role: "MEMBER",
                firebaseUid: firebaseUid,
                verificationToken: verificationToken,
                emailVerified: false,
              },
            });

            await tx.workspaceMember.create({
              data: {
                userId: createdUser.id,
                workspaceId: invitation.workspaceId,
                role: invitation.role,
              },
            });

            await tx.workspaceInvitation.update({
              where: { id: invitation.id },
              data: { status: 'ACCEPTED' },
            });

            return createdUser;
          });

          await sendEmailConfirmationEmail({
            to: newUser.email,
            firstName: newUser.firstName || "User",
            token: verificationToken,
          });

          return newUser;
        } catch (error) {
          throw new Error("Failed to create account and join workspace.");
        }
      } else {
        try {
          const user = await prisma.user.create({
            data: {
              email: args.email,
              firstName: args.firstName,
              lastName: args.lastName,
              avatarColor: avatarColor,
              role: args.role ?? "MEMBER",
              firebaseUid: firebaseUid,
              verificationToken: verificationToken,
              emailVerified: false,
            },
          });

          await sendEmailConfirmationEmail({
            to: user.email,
            firstName: user.firstName || "User",
            token: verificationToken,
          });

          return user;
        } catch (error: any) {
          if (error.code === 'P2002') throw new Error("An account with this email already exists.");
          throw new Error("Could not create user account.");
        }
      }
    },
    
    verifyEmail: async (_parent: unknown, { token }: { token: string }, context: GraphQLContext) => {
      const user = await prisma.user.findFirst({
        where: { verificationToken: token }
      });

      if (!user) {
        throw new UserInputError("Invalid or expired verification token.");
      }

      return await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
        }
      });
    },


    resendVerificationEmail: async (_parent: unknown, { email }: { email: string }, context: GraphQLContext) => {
      const user = await prisma.user.findUnique({ where: { email } });
    
      if (!user) throw new Error("User not found.");
      if (user.emailVerified) throw new Error("Email is already verified.");
    
      const newToken = crypto.randomBytes(32).toString('hex');
    
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken: newToken }
      });
    
      await sendEmailConfirmationEmail({
        to: user.email,
        firstName: user.firstName || "User",
        token: newToken,
      });
    
      return true;
    }
  },
};