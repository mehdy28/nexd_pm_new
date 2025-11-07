// lib/graphql-ws-server.ts
import { WebSocketServer } from 'ws'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { typeDefs } from '@/graphql/schema'
import { resolvers } from '@/graphql/resolvers'
import { useServer } from 'graphql-ws/use/ws';
import { buildWsContext } from './graphql-ws-context';
import { Server } from 'http';
import { parse } from 'url';

const schema = makeExecutableSchema({ typeDefs, resolvers })

let wsServer: WebSocketServer | null = null;
let serverCleanup: { dispose: () => Promise<void> } | null = null;

export function startWsServer(httpServer: Server) {
  if (wsServer) {
    return wsServer;
  }

  wsServer = new WebSocketServer({ 
    noServer: true,
    handleProtocols: (protocols) => {
      console.log('[handleProtocols] Client supports protocols:', protocols);
      if (protocols.has('graphql-ws')) {
        console.log("[handleProtocols] Agreed to use 'graphql-ws'.");
        return 'graphql-ws';
      }
      console.log("[handleProtocols] Client does not support 'graphql-ws'. Refusing connection.");
      return false; 
    }
  });

  serverCleanup = useServer({
      schema,
      context: async (ctx) => buildWsContext(ctx.connectionParams),
    }, wsServer
  );
  
  console.log('[WS Server] Attaching "upgrade" event listener to HTTP server...');
  
  httpServer.on('upgrade', (request, socket, head) => {
    console.log('--- [UPGRADE EVENT FIRED] ---');
    const { pathname } = parse(request.url || '', true);

    if (pathname === '/api/graphql') {
      wsServer!.handleUpgrade(request, socket, head, (ws) => {
        wsServer!.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  console.log('🚀 GraphQL WebSocket server is attached and ready.');
  return wsServer;
}