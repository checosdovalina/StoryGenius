import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import url from "url";

interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  matchId?: string;
}

export class MatchStatsWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocketClient>> = new Map();

  constructor(httpServer: Server) {
    this.wss = new WebSocketServer({ 
      server: httpServer,
      path: "/ws/match-stats"
    });

    this.wss.on("connection", (ws: WebSocketClient, req: IncomingMessage) => {
      ws.isAlive = true;

      // Parse matchId from query params
      const params = url.parse(req.url || "", true).query;
      const matchId = params.matchId as string;

      if (!matchId) {
        ws.close(1008, "matchId is required");
        return;
      }

      ws.matchId = matchId;

      // Add client to the match room
      if (!this.clients.has(matchId)) {
        this.clients.set(matchId, new Set());
      }
      this.clients.get(matchId)!.add(ws);

      console.log(`[WebSocket] Client connected to match ${matchId}`);

      // Handle pong response
      ws.on("pong", () => {
        ws.isAlive = true;
      });

      // Handle client messages (optional)
      ws.on("message", (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          console.log(`[WebSocket] Message from client:`, data);
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      });

      // Handle disconnection
      ws.on("close", () => {
        if (ws.matchId) {
          const matchClients = this.clients.get(ws.matchId);
          if (matchClients) {
            matchClients.delete(ws);
            if (matchClients.size === 0) {
              this.clients.delete(ws.matchId);
            }
          }
          console.log(`[WebSocket] Client disconnected from match ${ws.matchId}`);
        }
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: "connected",
        matchId,
        message: "Connected to match stats updates"
      }));
    });

    // Heartbeat to detect broken connections
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const client = ws as WebSocketClient;
        if (!client.isAlive) {
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    this.wss.on("close", () => {
      clearInterval(interval);
    });
  }

  // Broadcast to all clients watching a specific match
  broadcastToMatch(matchId: string, data: any) {
    const matchClients = this.clients.get(matchId);
    if (!matchClients) return;

    const message = JSON.stringify(data);
    matchClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    console.log(`[WebSocket] Broadcasted to ${matchClients.size} clients for match ${matchId}`);
  }

  // Send to specific client
  sendToClient(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  // Get number of clients watching a match
  getMatchClientCount(matchId: string): number {
    return this.clients.get(matchId)?.size || 0;
  }
}
