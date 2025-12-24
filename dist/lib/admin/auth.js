"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
exports.isUserAdmin = isUserAdmin;
exports.promoteUserToAdmin = promoteUserToAdmin;
exports.demoteAdminUser = demoteAdminUser;
const firebase_1 = require("@/lib/firebase");
const firestore_1 = require("firebase/firestore");
const auth_1 = require("firebase-admin/auth");
async function requireAdmin(context) {
    let user = context?.user;
    if (!user) {
        throw new Error("Authentication required");
    }
    if (user.role !== "ADMIN") {
        throw new Error("Admin access required");
    }
    return user;
}
async function isUserAdmin(userId) {
    const userDoc = await (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, "users", userId));
    const userData = userDoc.data();
    return userData?.role === "ADMIN";
}
async function promoteUserToAdmin(userId, promotedBy) {
    const promoterDoc = await (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, "users", promotedBy));
    const promoterData = promoterDoc.data();
    if (promoterData?.role !== "ADMIN") {
        throw new Error("Only admins can promote users");
    }
    // Update user role in Firestore
    await (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, "users", userId), {
        role: "ADMIN",
        updatedAt: new Date(),
    });
    // Set custom claims in Firebase Auth
    await auth_1.auth.setCustomUserClaims(userId, { role: "ADMIN" });
    // Log the promotion
    await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, "activities"), {
        type: "USER_PROMOTED",
        data: {
            targetUserId: userId,
            promotedBy: promotedBy,
        },
        userId: promotedBy,
        createdAt: new Date(),
    });
    // Get updated user data
    const updatedUserDoc = await (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, "users", userId));
    return { id: userId, ...updatedUserDoc.data() };
}
async function demoteAdminUser(userId, demotedBy) {
    const demoterDoc = await (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, "users", demotedBy));
    const demoterData = demoterDoc.data();
    if (demoterData?.role !== "ADMIN") {
        throw new Error("Only admins can demote users");
    }
    // Prevent self-demotion
    if (userId === demotedBy) {
        throw new Error("Cannot demote yourself");
    }
    // Update user role in Firestore
    await (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, "users", userId), {
        role: "MEMBER",
        updatedAt: new Date(),
    });
    // Remove custom claims in Firebase Auth
    await auth_1.auth.setCustomUserClaims(userId, { role: "MEMBER" });
    // Log the demotion
    await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, "activities"), {
        type: "USER_DEMOTED",
        data: {
            targetUserId: userId,
            demotedBy: demotedBy,
        },
        userId: demotedBy,
        createdAt: new Date(),
    });
    // Get updated user data
    const updatedUserDoc = await (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, "users", userId));
    return { id: userId, ...updatedUserDoc.data() };
}
