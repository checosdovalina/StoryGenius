import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import url from "url";
import { storage } from "./storage";

interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  matchId?: string;
  userId?: string;
  scope?: 'stats' | 'public';
  tournamentId?: string;
}

export class MatchStatsWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocketClient>> = new Map();
  private publicClients: Set<WebSocketClient> = new Set();
  private pendingBroadcasts: Map<string, NodeJS.Timeout> = new Map();

  constructor(httpServer: Server) {
    // Single WebSocket server handling both protected and public channels
    this.wss = new WebSocketServer({ 
      server: httpServer,
      noServer: true
    });

    // Handle upgrade requests and route to appropriate handler
    httpServer.on('upgrade', (req, socket, head) => {
      const pathname = url.parse(req.url || '').pathname;

      if (pathname === '/ws/match-stats' || pathname === '/ws/public-display') {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });

    // Setup WebSocket connection handler
    this.wss.on("connection", async (ws: WebSocketClient, req: IncomingMessage) => {
      ws.isAlive = true;

      const pathname = url.parse(req.url || '').pathname;
      const params = url.parse(req.url || "", true).query;

      // Determine scope based on pathname
      if (pathname === '/ws/public-display') {
        // Public display channel - no authentication required
        ws.scope = 'public';
        const tournamentId = params.tournamentId as string;
        ws.tournamentId = tournamentId || 'all';

        this.publicClients.add(ws);
        console.log(`[WebSocket Public] Client connected to public display (tournament: ${ws.tournamentId})`);

        ws.send(JSON.stringify({
          type: "connected",
          scope: "public",
          message: "Connected to public display updates"
        }));

      } else if (pathname === '/ws/match-stats') {
        // Stats capture channel - requires authentication
        ws.scope = 'stats';
        const matchId = params.matchId as string;

        if (!matchId) {
          ws.close(1008, "matchId is required");
          return;
        }

        // Authentication check
        const cookieHeader = req.headers.cookie;
        if (!cookieHeader || !cookieHeader.includes('connect.sid')) {
          console.log('[WebSocket] No session cookie found, rejecting connection');
          ws.close(1008, "Authentication required");
          return;
        }

        ws.matchId = matchId;

        // Add client to the match room
        if (!this.clients.has(matchId)) {
          this.clients.set(matchId, new Set());
        }
        this.clients.get(matchId)!.add(ws);

        console.log(`[WebSocket Stats] Client connected to match ${matchId}`);

        ws.send(JSON.stringify({
          type: "connected",
          matchId,
          scope: "stats",
          message: "Connected to match stats updates"
        }));
      } else {
        ws.close(1008, "Invalid WebSocket path");
        return;
      }

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
        if (ws.scope === 'stats' && ws.matchId) {
          const matchClients = this.clients.get(ws.matchId);
          if (matchClients) {
            matchClients.delete(ws);
            if (matchClients.size === 0) {
              this.clients.delete(ws.matchId);
            }
          }
          console.log(`[WebSocket Stats] Client disconnected from match ${ws.matchId}`);
        } else if (ws.scope === 'public') {
          this.publicClients.delete(ws);
          console.log(`[WebSocket Public] Client disconnected`);
        }
      });
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

  // Broadcast to all clients watching a specific match (stats capture)
  broadcastToMatch(matchId: string, data: any) {
    const matchClients = this.clients.get(matchId);
    if (!matchClients) return;

    const message = JSON.stringify(data);
    matchClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    console.log(`[WebSocket Stats] Broadcasted to ${matchClients.size} clients for match ${matchId}`);
    
    // Also notify public displays about the update with throttling
    this.throttledPublicBroadcast(matchId, data);
  }

  // Throttled broadcast to public displays
  private throttledPublicBroadcast(matchId: string, data: any) {
    // Clear existing timeout for this match
    const existing = this.pendingBroadcasts.get(matchId);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new broadcast with 250ms delay (coalescing rapid updates)
    const timeout = setTimeout(async () => {
      this.pendingBroadcasts.delete(matchId);
      
      // Fetch sanitized match data
      const matches = await storage.getActiveMatches();
      const matchData = matches.find((m) => m.session.matchId === matchId);
      
      if (matchData) {
        const sanitized = this.sanitizePublicPayload(matchData);
        this.broadcastToPublicClients(sanitized);
      }
    }, 250);

    this.pendingBroadcasts.set(matchId, timeout);
  }

  // Sanitize payload for public display (remove sensitive data)
  private sanitizePublicPayload(match: any) {
    return {
      type: "match_update",
      match: {
        session: {
          id: match.session.id,
          matchId: match.session.matchId,
          player1Id: match.session.player1Id,
          player2Id: match.session.player2Id,
          player3Id: match.session.player3Id,
          player4Id: match.session.player4Id,
          status: match.session.status,
          matchType: match.session.matchType,
          currentSet: match.session.currentSet,
          currentServer: match.session.currentServer,
          player1Set1Score: match.session.player1Set1Score,
          player2Set1Score: match.session.player2Set1Score,
          player1Set2Score: match.session.player1Set2Score,
          player2Set2Score: match.session.player2Set2Score,
          player1Set3Score: match.session.player1Set3Score,
          player2Set3Score: match.session.player2Set3Score,
          player1TechnicalFouls: match.session.player1TechnicalFouls,
          player2TechnicalFouls: match.session.player2TechnicalFouls,
          player1Timeouts: match.session.player1Timeouts,
          player2Timeouts: match.session.player2Timeouts,
          player1Appellations: match.session.player1Appellations,
          player2Appellations: match.session.player2Appellations,
        },
        match: {
          id: match.match.id,
          tournamentId: match.match.tournamentId,
          round: match.match.round,
        },
        tournament: {
          id: match.tournament.id,
          name: match.tournament.name,
          matchRotationInterval: match.tournament.matchRotationInterval,
        },
        player1: {
          id: match.player1.id,
          name: match.player1.name,
          photoUrl: match.player1.photoUrl,
          nationality: match.player1.nationality,
        },
        player2: match.player2 ? {
          id: match.player2.id,
          name: match.player2.name,
          photoUrl: match.player2.photoUrl,
          nationality: match.player2.nationality,
        } : null,
        player3: match.player3 ? {
          id: match.player3.id,
          name: match.player3.name,
          photoUrl: match.player3.photoUrl,
          nationality: match.player3.nationality,
        } : null,
        player4: match.player4 ? {
          id: match.player4.id,
          name: match.player4.name,
          photoUrl: match.player4.photoUrl,
          nationality: match.player4.nationality,
        } : null,
      }
    };
  }

  // Broadcast to all public display clients
  broadcastToPublicClients(data: any) {
    const message = JSON.stringify(data);
    let sent = 0;

    this.publicClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // Filter by tournament if client has specific tournament
        if (client.tournamentId === 'all' || 
            client.tournamentId === data.match?.tournament?.id) {
          client.send(message);
          sent++;
        }
      }
    });

    if (sent > 0) {
      console.log(`[WebSocket Public] Broadcasted to ${sent} public displays`);
    }
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

  // Get number of public display clients
  getPublicClientCount(): number {
    return this.publicClients.size;
  }
}
