import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Match, MatchStatsSession, MatchEvent, Tournament, User } from "@shared/schema";
import { ArrowLeft, Trophy, Clock } from "lucide-react";

export default function StatsCapturePageComponent() {
  const { matchId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<MatchStatsSession | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Check authorization
  useEffect(() => {
    if (!user || !["admin", "escribano"].includes(user.role)) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Fetch match data
  const { data: match } = useQuery<Match>({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId
  });

  // Fetch tournament data
  const { data: tournament } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${match?.tournamentId}`],
    enabled: !!match?.tournamentId
  });

  // Fetch users for player names
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const player1 = users.find(u => u.id === match?.player1Id);
  const player2 = users.find(u => u.id === match?.player2Id);

  // Start stats session mutation
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/matches/${matchId}/stats/start`);
      return await response.json();
    },
    onSuccess: (data: MatchStatsSession) => {
      setSession(data);
      toast({ title: "Sesión iniciada", description: "Puedes comenzar a capturar estadísticas" });
    },
    onError: (error: any) => {
      toast({ title: "Error al iniciar sesión", description: error.message, variant: "destructive" });
    }
  });

  // Check for active session
  useEffect(() => {
    if (!matchId) return;

    const checkActiveSession = async () => {
      try {
        const response = await apiRequest("GET", `/api/matches/${matchId}/stats/active`);
        if (response.ok) {
          const data = await response.json();
          setSession(data);
        }
      } catch (error) {
        // No active session found
      }
    };

    checkActiveSession();
  }, [matchId]);

  // WebSocket connection
  useEffect(() => {
    if (!matchId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/match-stats?matchId=${matchId}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('[WebSocket] Connected to match stats');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Received:', data);

        if (data.type === 'session_update') {
          setSession(data.session);
        } else if (data.type === 'match_event') {
          setSession(data.session);
          queryClient.invalidateQueries({ queryKey: [`/api/stats/sessions/${session?.id}/events`] });
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    websocket.onclose = () => {
      console.log('[WebSocket] Disconnected');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [matchId, session?.id]);

  // Record point mutation
  const recordPointMutation = useMutation({
    mutationFn: async (data: { playerId: string; player1Score: string; player2Score: string }) => {
      const response = await apiRequest("POST", `/api/stats/sessions/${session?.id}/events`, {
        eventType: "point_won",
        playerId: data.playerId,
        setNumber: session?.currentSet || 1,
        player1Score: data.player1Score,
        player2Score: data.player2Score
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Punto registrado" });
    },
    onError: () => {
      toast({ title: "Error al registrar punto", variant: "destructive" });
    }
  });

  // Update session score mutation
  const updateScoreMutation = useMutation({
    mutationFn: async (updates: Partial<MatchStatsSession>) => {
      const response = await apiRequest("PUT", `/api/stats/sessions/${session?.id}`, updates);
      return await response.json();
    },
    onSuccess: (data) => {
      setSession(data);
    }
  });

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/stats/sessions/${session?.id}/complete`);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Sesión finalizada", description: "Las estadísticas han sido guardadas" });
      setLocation(`/tournaments/${match?.tournamentId}`);
    },
    onError: () => {
      toast({ title: "Error al finalizar sesión", variant: "destructive" });
    }
  });

  if (!match || !tournament) {
    return (
      <div className="container mx-auto p-4">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Button 
        variant="ghost" 
        onClick={() => setLocation(`/tournaments/${match.tournamentId}`)}
        data-testid="button-back"
        className="mb-4 min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al torneo
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Captura de Estadísticas</span>
            <Badge>{tournament.sport.toUpperCase()}</Badge>
          </CardTitle>
          <CardDescription>
            {match.round} - Partido {match.bracketPosition}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 items-center mb-6">
            <div className="text-center">
              <h3 className="font-bold text-lg">{player1?.name || "TBD"}</h3>
              <div className="text-3xl font-bold mt-2">{session?.player1CurrentScore || "0"}</div>
              <div className="text-sm text-muted-foreground mt-1">Sets: {session?.player1Sets || 0}</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">VS</div>
            </div>

            <div className="text-center">
              <h3 className="font-bold text-lg">{player2?.name || "TBD"}</h3>
              <div className="text-3xl font-bold mt-2">{session?.player2CurrentScore || "0"}</div>
              <div className="text-sm text-muted-foreground mt-1">Sets: {session?.player2Sets || 0}</div>
            </div>
          </div>

          {session ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Set {session.currentSet}
                </div>
                <Badge variant="outline">{session.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  onClick={() => {
                    // TODO: Implement scoring logic
                    const newScore = "15"; // Placeholder
                    recordPointMutation.mutate({
                      playerId: match.player1Id,
                      player1Score: newScore,
                      player2Score: session.player2CurrentScore || "0"
                    });
                  }}
                  data-testid="button-point-player1"
                  className="min-h-[60px]"
                >
                  Punto {player1?.name}
                </Button>

                <Button
                  size="lg"
                  onClick={() => {
                    // TODO: Implement scoring logic
                    const newScore = "15"; // Placeholder
                    recordPointMutation.mutate({
                      playerId: match.player2Id,
                      player1Score: session.player1CurrentScore || "0",
                      player2Score: newScore
                    });
                  }}
                  data-testid="button-point-player2"
                  className="min-h-[60px]"
                >
                  Punto {player2?.name}
                </Button>
              </div>

              <div className="flex gap-2 justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => completeSessionMutation.mutate()}
                  disabled={completeSessionMutation.isPending}
                  data-testid="button-complete-session"
                  className="min-h-[44px]"
                >
                  Finalizar partido
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Button
                onClick={() => startSessionMutation.mutate()}
                disabled={startSessionMutation.isPending}
                data-testid="button-start-session"
                className="min-h-[44px]"
              >
                <Clock className="h-4 w-4 mr-2" />
                {startSessionMutation.isPending ? "Iniciando..." : "Iniciar captura"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
