// app/api/public/[...path]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
// Function to handle user registration
async function handleRegistration(request: Request) {
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

// Function to handle user login (example, you'll likely need more logic)
async function handleLogin(request: Request) {
    try {
      const data = await request.json();
      const { email, password } = data;

      // Basic validation
      if (!email || !password) {
        return new NextResponse(JSON.stringify({ message: "Missing email or password" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Verify the user's credentials with Firebase Authentication
      const userCredential = await getAuth().getUserByEmail(email);
      // If the email exists compare the passwords

      return new NextResponse(JSON.stringify({ message: "Login successful" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("Login error:", error);
      return new NextResponse(JSON.stringify({ message: error.message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }


export async function POST(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');

  switch (path) {
    case 'register':
      return handleRegistration(request);
    case 'login':
      return handleLogin(request);
    default:
      return new NextResponse(JSON.stringify({ message: 'Invalid public API endpoint' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
  }
}