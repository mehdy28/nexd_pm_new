import { prisma } from "../../lib/prisma.js";
import { UserInputError } from "apollo-server-micro";
import { sendEarlyAccessConfirmationEmail } from "../../lib/email/index.js";
export const earlyAccessResolver = {
    Query: {
        earlyAccessUsers: async (_parent, _args, context) => {
            // IMPORTANT: This query should be protected and only accessible by ADMIN users.
            // This logic should be implemented in your authentication middleware.
            if (context.user?.role !== "ADMIN") {
                throw new Error("You are not authorized to perform this action.");
            }
            try {
                const users = await prisma.earlyAccessUser.findMany({
                    orderBy: {
                        createdAt: "desc",
                    },
                });
                return users;
            }
            catch (error) {
                console.error("Error fetching early access users:", error);
                throw new Error("Failed to fetch early access user list.");
            }
        },
    },
    Mutation: {
        createEarlyAccessUser: async (_parent, args) => {
            const { name, email } = args;
            if (!name || name.trim().length < 2) {
                throw new UserInputError("Name must be at least 2 characters long.");
            }
            if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
                throw new UserInputError("You must provide a valid email address.");
            }
            try {
                console.log(`Attempting to create early access user: ${email}`);
                const newUser = await prisma.earlyAccessUser.create({
                    data: {
                        name: name.trim(),
                        email: email.toLowerCase().trim(),
                    },
                });
                console.log(`User created in DB: ${newUser.email}. Attempting to send confirmation email.`);
                // Send confirmation email after successfully creating the user
                await sendEarlyAccessConfirmationEmail({
                    to: newUser.email,
                    name: newUser.name,
                });
                console.log(`Confirmation email function executed for user: ${newUser.email}`);
                return newUser;
            }
            catch (error) {
                console.error("Error in createEarlyAccessUser mutation:", error);
                // Handle unique constraint violation for the email field
                if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
                    throw new UserInputError("This email is already on the waitlist.");
                }
                // Note: If the error originated from sendEarlyAccessConfirmationEmail, the error log in lib/email/index.ts
                // should capture the nodemailer specific error (e.g., Auth, DNS, or attachment path error).
                throw new Error("Could not add to the waitlist. Please try again later.");
            }
        },
    },
};
