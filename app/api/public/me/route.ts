// app/api/public/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  console.log("GET /api/public/me called");

  const authHeader = req.headers.get("authorization");
  console.log("Authorization header:", authHeader);

  if (!authHeader) {
    console.log("No token provided");
    return NextResponse.json({ message: "No token provided" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  console.log("Token extracted:", token);

  if (!token) {
    console.log("Invalid token format");
    return NextResponse.json({ message: "Invalid token format" }, { status: 401 });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log("Firebase ID token decoded:", decodedToken);

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
      },
    });

    console.log("User from Prisma:", user);

    if (!user) {
      console.log("User not found in database");
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error in GET /api/public/me:", error);
    return NextResponse.json({ message: error.message }, { status: 401 });
  }
}
