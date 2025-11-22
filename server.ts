//server.ts
import next from 'next';
import { createServer, Server } from 'http';
import { parse } from 'url';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { prisma } from './lib/prisma';
import { pubsub } from './graphql/pubsub';
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
        context: async (ctx: any) => {
          const rawAuth = ctx.connectionParams?.authorization as string | undefined;
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
        onConnect: async (ctx) => {
          log(`🔗 WebSocket connected from ${ctx.extra.request.socket.remoteAddress}`);
        },
        onDisconnect: async (ctx, code, reason) => {
          log(
            `❌ WebSocket disconnected [${ctx.extra.request.socket.remoteAddress}] Code: ${code} Reason: ${
              reason?.toString() || 'none'
            }`
          );
        },
        onError: (ctx, msg, errors) => {
          logError('⚠️ WebSocket error:', msg, errors);
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
      bodyParserConfig: { limit: '10mb' } // Sets the maximum request body size for GraphQL endpoint
    });

    log('✅ Apollo GraphQL server initialized.');

    // Let Next.js handle all unmatched routes safely
    app.use((req: any, res: any) => {
      return handle(req, res, parse(req.url!, true));
    });


    httpServer.listen(3000, () => {
      log(`🚀 Server ready at: http://localhost:3000`);
      log(`📡 GraphQL HTTP endpoint: http://localhost:3000/api/graphql`);
      log(`🔄 GraphQL WebSocket endpoint: ws://localhost:3000/api/graphql`);
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