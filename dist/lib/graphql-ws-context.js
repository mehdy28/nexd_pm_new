import { db } from "@/lib/firebase";
import { prisma } from "./prisma.js";
import { getAuth } from "firebase-admin/auth";
export const buildWsContext = async (connectionParams) => {
    const rawAuth = connectionParams?.authorization || connectionParams?.Authorization || null;
    const token = typeof rawAuth === "string" ? rawAuth.replace("Bearer ", "") : null;
    let user = undefined;
    let decodedToken = undefined;
    if (token) {
        try {
            decodedToken = await getAuth().verifyIdToken(token);
            const prismaUser = await prisma.user.findUnique({
                where: { firebaseUid: decodedToken.uid },
            });
            if (prismaUser) {
                user = {
                    id: prismaUser.id,
                    email: prismaUser.email,
                    name: `${prismaUser.firstName} ${prismaUser.lastName}`, // Example: construct full name
                    role: prismaUser.role,
                    firebaseUid: decodedToken.uid,
                };
            }
        }
        catch (err) {
            console.error("[WS] Token verification failed:", err?.message ?? err);
            // Do not throw here, just fail gracefully without a user.
        }
    }
    return {
        db,
        prisma,
        user,
        decodedToken,
    };
};
