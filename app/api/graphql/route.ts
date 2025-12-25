// app/api/graphql/route.ts

import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

import { typeDefs } from '../../../graphql/schema';
import { resolvers } from '../../../graphql/resolvers';
import { prisma } from '../../../lib/prisma';
import { pubsub } from '../../../graphql/pubsub';

// --- FIREBASE ADMIN INITIALIZATION ---
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  console.log('✅ Firebase Admin SDK initialized for API route.');
}

const schema = makeExecutableSchema({ typeDefs, resolvers });

const server = new ApolloServer({
  schema,
});

// The context type must be defined for type safety in your resolvers
export interface MyContext {
  prisma?: typeof prisma;
  pubsub?: typeof pubsub;
  user?: {
    id: string;
    email: string | null;
    role: string;
    firebaseUid: string;
  };
  decodedToken?: DecodedIdToken | null;
}

const handler = startServerAndCreateNextHandler<NextRequest, MyContext>(server, {
  context: async (req) => {
    const rawAuth = req.headers.get('authorization') || null;
    const token = typeof rawAuth === 'string' ? rawAuth.replace('Bearer ', '') : null;
    let user = undefined;
    let decodedToken: DecodedIdToken | null = null;

    if (token) {
      try {
        decodedToken = await getAuth().verifyIdToken(token);
        if (decodedToken) {
          const prismaUser = await prisma.user.findUnique({
            where: { firebaseUid: decodedToken.uid },
          });
          if (prismaUser) {
            user = {
              id: prismaUser.id,
              email: prismaUser.email,
              role: prismaUser.role,
              firebaseUid: decodedToken.uid,
            };
          }
        }
      } catch (e) {
        // Auth error is silent, context will not have a user
        console.error('API route auth error:', e);
      }
    }
    return { prisma, user, pubsub, decodedToken };
  },
});

export { handler as GET, handler as POST };