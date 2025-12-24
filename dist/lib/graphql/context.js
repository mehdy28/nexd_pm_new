import { prisma } from "../../lib/prisma.js";
import { adminAuth } from "@/lib/firebase-admin";
export async function createContext({ req }) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        // If there's no token, return a completely null context.
        return { user: null, decodedToken: null };
    }
    const token = authHeader.split(" ")[1];
    try {
        // Verify the token. This remains the same.
        const decodedToken = await adminAuth.verifyIdToken(token);
        // Attempt to find the user, but do not return early if they are not found.
        const prismaUser = await prisma.user.findUnique({
            where: { firebaseUid: decodedToken.uid },
        });
        // Construct the final context object, including BOTH the prismaUser (if found)
        // and the decodedToken. This ensures createUser has the uid it needs.
        return {
            user: prismaUser ? {
                id: prismaUser.id,
                email: prismaUser.email,
                firstName: prismaUser.firstName,
                lastName: prismaUser.lastName,
                role: prismaUser.role,
            } : null,
            decodedToken: decodedToken, // Always pass the valid token
        };
    }
    catch (err) {
        // If token verification fails, return a null context.
        return { user: null, decodedToken: null };
    }
}
