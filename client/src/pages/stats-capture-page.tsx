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
import { calculateScore, type ScoreState } from "@/lib/scoring";

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
  const { data: match, isLoading: matchLoading } = useQuery<Match>({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId
  });

  // Fetch tournament data
  const { data: tournament, isLoading: tournamentLoading } = useQuery<Tournament>({
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

  // WebSocket connection - only connect when session is active
  useEffect(() => {
    if (!matchId || !session?.id) return;

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

        if (data.type === 'session_update' && data.session) {
          setSession(data.session);
        } else if (data.type === 'match_event' && data.session) {
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

  if (matchLoading || tournamentLoading) {
    return (
      <div className="container mx-auto p-4">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!match || !tournament) {
    return (
      <div className="container mx-auto p-4">
        <p>Error: No se pudo cargar la información del partido</p>
        <Button onClick={() => setLocation("/")} className="mt-4">
          Volver al inicio
        </Button>
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
                  onClick={async () => {
                    // Get current games from JSON array
                    let currentGames1 = 0, currentGames2 = 0;
                    try {
                      const games1 = session.player1Games ? JSON.parse(session.player1Games) : [];
                      const games2 = session.player2Games ? JSON.parse(session.player2Games) : [];
                      currentGames1 = games1[session.currentSet - 1] || 0;
                      currentGames2 = games2[session.currentSet - 1] || 0;
                    } catch (e) {
                      currentGames1 = 0;
                      currentGames2 = 0;
                    }

                    const currentState: ScoreState = {
                      player1Score: session.player1CurrentScore || "0",
                      player2Score: session.player2CurrentScore || "0",
                      player1Games: currentGames1,
                      player2Games: currentGames2,
                      player1Sets: session.player1Sets || 0,
                      player2Sets: session.player2Sets || 0,
                      currentSet: session.currentSet || 1
                    };
                    
                    const newState = calculateScore(tournament.sport, currentState, "player1");
                    
                    // Build games arrays
                    const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                    const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                    games1Array[newState.currentSet - 1] = newState.player1Games;
                    games2Array[newState.currentSet - 1] = newState.player2Games;
                    
                    // Update session with new scores
                    await updateScoreMutation.mutateAsync({
                      player1CurrentScore: newState.player1Score,
                      player2CurrentScore: newState.player2Score,
                      player1Sets: newState.player1Sets,
                      player2Sets: newState.player2Sets,
                      currentSet: newState.currentSet,
                      player1Games: JSON.stringify(games1Array),
                      player2Games: JSON.stringify(games2Array)
                    });
                    
                    // Record event after update
                    recordPointMutation.mutate({
                      playerId: match.player1Id,
                      player1Score: newState.player1Score,
                      player2Score: newState.player2Score
                    });
                  }}
                  data-testid="button-point-player1"
                  className="min-h-[60px]"
                  disabled={updateScoreMutation.isPending || recordPointMutation.isPending}
                >
                  Punto {player1?.name}
                </Button>

                <Button
                  size="lg"
                  onClick={async () => {
                    // Get current games from JSON array
                    let currentGames1 = 0, currentGames2 = 0;
                    try {
                      const games1 = session.player1Games ? JSON.parse(session.player1Games) : [];
                      const games2 = session.player2Games ? JSON.parse(session.player2Games) : [];
                      currentGames1 = games1[session.currentSet - 1] || 0;
                      currentGames2 = games2[session.currentSet - 1] || 0;
                    } catch (e) {
                      currentGames1 = 0;
                      currentGames2 = 0;
                    }

                    const currentState: ScoreState = {
                      player1Score: session.player1CurrentScore || "0",
                      player2Score: session.player2CurrentScore || "0",
                      player1Games: currentGames1,
                      player2Games: currentGames2,
                      player1Sets: session.player1Sets || 0,
                      player2Sets: session.player2Sets || 0,
                      currentSet: session.currentSet || 1
                    };
                    
                    const newState = calculateScore(tournament.sport, currentState, "player2");
                    
                    // Build games arrays
                    const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                    const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                    games1Array[newState.currentSet - 1] = newState.player1Games;
                    games2Array[newState.currentSet - 1] = newState.player2Games;
                    
                    // Update session with new scores
                    await updateScoreMutation.mutateAsync({
                      player1CurrentScore: newState.player1Score,
                      player2CurrentScore: newState.player2Score,
                      player1Sets: newState.player1Sets,
                      player2Sets: newState.player2Sets,
                      currentSet: newState.currentSet,
                      player1Games: JSON.stringify(games1Array),
                      player2Games: JSON.stringify(games2Array)
                    });
                    
                    // Record event after update
                    recordPointMutation.mutate({
                      playerId: match.player2Id,
                      player1Score: newState.player1Score,
                      player2Score: newState.player2Score
                    });
                  }}
                  data-testid="button-point-player2"
                  className="min-h-[60px]"
                  disabled={updateScoreMutation.isPending || recordPointMutation.isPending}
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
