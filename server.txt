//server.ts
import next from 'next';
import { createServer, Server, IncomingMessage } from 'http';
import { parse } from 'url';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { Context, SubscribeMessage, SubscribePayload } from 'graphql-ws';
import { GraphQLError } from 'graphql';
import { typeDefs } from './graphql/schema/index.js'; // ADJUSTED to match file structure (graphql/schema/index.ts)
import { resolvers } from './graphql/resolvers/index.js'; // RESOLVED TO INDEX FILE
import { prisma } from './lib/prisma.js';
import { pubsub } from './graphql/pubsub.js';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Utility for timestamped logging
const log = (...args: any[]) => console.log(`[${new Date().toISOString()}]`, ...args);
const logError = (...args: any[]) => console.error(`[${new Date().toISOString()}] ❌`, ...args);

async function startServer() {
  try {
    // --- FIREBASE ADMIN INITIALIZATION ---
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      log('✅ Firebase Admin SDK initialized.');
    } else {
      log('ℹ️ Firebase already initialized.');
    }

    const dev = process.env.NODE_ENV !== 'production';
    const nextApp = next({ dev });
    const handle = nextApp.getRequestHandler();

    await nextApp.prepare();
    log('✅ Next.js app prepared.');

    const app = express();
    const httpServer: Server = createServer(app);

    const schema = makeExecutableSchema({ typeDefs, resolvers });

    // --- WEBSOCKET SERVER (for Subscriptions) ---
    const wsServer = new WebSocketServer({
      server: httpServer,
      path: '/api/graphql',
    });

    log('🧩 WebSocket server created. Attaching handlers...');

    const wsCleanup = useServer(
      {
        schema,
        context: async (ctx: Context<{ authorization?: string }>) => {
          const rawAuth = ctx.connectionParams?.authorization;
          const token = rawAuth ? rawAuth.replace('Bearer ', '') : null;
          let user = undefined;
          if (token) {
            try {
              const decodedToken = await getAuth().verifyIdToken(token);
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
            } catch (e) {
              logError('WebSocket auth error:', e);
            }
          }
          return { prisma, user, pubsub };
        },
        onConnect: async (ctx: Context) => {
          const { request } = ctx.extra as { request: IncomingMessage };
          log(`🔗 WebSocket connected from ${request.socket.remoteAddress}`);
        },
        onDisconnect: async (ctx: Context, code?: number, reason?: string) => {
          const { request } = ctx.extra as { request: IncomingMessage };
          log(
            `❌ WebSocket disconnected [${request.socket.remoteAddress}] Code: ${code} Reason: ${
              reason?.toString() || 'none'
            }`
          );
        },
        onError: (ctx: Context, id: string, payload: SubscribePayload, errors: readonly GraphQLError[]) => {
          logError('⚠️ WebSocket error:', { id, payload }, errors);
        },
      },
      wsServer
    );

    // --- APOLLO SERVER (for Queries and Mutations) ---
    const apolloServer = new ApolloServer({
      schema,
      context: async ({ req }) => {
        const rawAuth = req.headers.authorization || null;
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
            logError('HTTP auth error:', e);
          }
        }
        return { prisma, user, pubsub, decodedToken };
      },
      plugins: [
        {
          async serverWillStart() {
            log('🚀 Apollo Server starting...');
            return {
              async drainServer() {
                log('💧 Draining WebSocket connections...');
                await wsCleanup.dispose();
              },
            };
          },
        },
      ],
    });

    await apolloServer.start();
    // Configure body parsing limit directly in applyMiddleware to avoid double parsing conflict
    apolloServer.applyMiddleware({
      app,
      path: '/api/graphql',
      bodyParserConfig: { limit: '10mb' }, // Sets the maximum request body size for GraphQL endpoint
    });

    log('✅ Apollo GraphQL server initialized.');

    // Let Next.js handle all unmatched routes safely
    app.use((req: any, res: any) => {
      return handle(req, res, parse(req.url!, true));
    });

    // *** THIS IS THE FIX ***
    // Use the PORT from environment variables for production, fallback to 3000 for local dev
    const PORT = process.env.PORT || 3000;

    httpServer.listen(PORT, () => {
      log(`🚀 Server ready at: http://localhost:${PORT}`);
      log(`📡 GraphQL HTTP endpoint: http://localhost:${PORT}/api/graphql`);
      log(`🔄 GraphQL WebSocket endpoint: ws://localhost:${PORT}/api/graphql`);
    });
  } catch (err) {
    logError('Fatal error starting server:', err);
    process.exit(1);
  }

  // --- GRACEFUL SHUTDOWN ---
  process.on('SIGINT', async () => {
    log('🛑 Caught SIGINT. Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    log('🛑 Caught SIGTERM. Shutting down gracefully...');
    process.exit(0);
  });
}

startServer();