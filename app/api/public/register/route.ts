// app/api/public/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { firebaseUid, email, firstName, lastName } = data;

    // Validate input data (add more validation as needed)
    if (!firebaseUid || !email) {
      return new NextResponse(JSON.stringify({ message: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await prisma.user.create({
      data: {
        firebaseUid,
        email,
        firstName,
        lastName,
      },
    });

    return new NextResponse(JSON.stringify(user), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return new NextResponse(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}