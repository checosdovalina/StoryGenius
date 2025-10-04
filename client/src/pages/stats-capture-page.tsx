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
import { ArrowLeft, Trophy, Clock, Zap, X, AlertTriangle } from "lucide-react";
import { calculateScore, type ScoreState } from "@/lib/scoring";
import { format } from "date-fns";

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

  // Record special event mutation (ace, double_fault, error)
  const recordSpecialEventMutation = useMutation({
    mutationFn: async (data: { eventType: "ace" | "double_fault" | "error"; playerId: string; player1Score: string; player2Score: string }) => {
      const response = await apiRequest("POST", `/api/stats/sessions/${session?.id}/events`, {
        eventType: data.eventType,
        playerId: data.playerId,
        setNumber: session?.currentSet || 1,
        player1Score: data.player1Score,
        player2Score: data.player2Score
      });
      return await response.json();
    },
    onSuccess: (_, variables) => {
      const eventNames = {
        ace: "Ace",
        double_fault: "Doble falta",
        error: "Error"
      };
      toast({ title: `${eventNames[variables.eventType]} registrado` });
    },
    onError: () => {
      toast({ title: "Error al registrar evento", variant: "destructive" });
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
    <div className="min-h-screen pb-32 md:pb-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto p-4 max-w-4xl">
          <Button 
            variant="ghost" 
            onClick={() => setLocation(`/tournaments/${match.tournamentId}`)}
            data-testid="button-back"
            className="min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al torneo
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl md:text-2xl">Captura de Estadísticas</CardTitle>
              <Badge className="text-xs">{tournament.sport.toUpperCase()}</Badge>
            </div>
            <CardDescription className="text-sm">
              {match.round} - Partido {match.bracketPosition}
            </CardDescription>
            {session && (
              <div className="mt-3 pt-3 border-t text-xs space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Inicio: {format(new Date(session.startedAt), 'HH:mm:ss - dd/MM/yyyy')}</span>
                </div>
                {session.completedAt && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Fin: {format(new Date(session.completedAt), 'HH:mm:ss - dd/MM/yyyy')}</span>
                  </div>
                )}
                {!session.completedAt && (
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                    <span>Sesión activa</span>
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Score Display - Mobile First */}
            <div className="space-y-4">
              {/* Player 1 */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base md:text-lg truncate">{player1?.name || "TBD"}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">Sets: {session?.player1Sets || 0}</Badge>
                  </div>
                </div>
                <div className="text-4xl md:text-5xl font-bold tracking-tight ml-4">
                  {session?.player1CurrentScore || "0"}
                </div>
              </div>

              {/* VS Divider */}
              <div className="flex items-center justify-center py-2">
                <div className="flex items-center gap-3 text-muted-foreground">
                  {session && (
                    <>
                      <Trophy className="h-4 w-4" />
                      <span className="text-sm font-medium">Set {session.currentSet}</span>
                      <Badge variant="outline" className="text-xs">{session.status}</Badge>
                    </>
                  )}
                  {!session && <span className="text-lg font-semibold">VS</span>}
                </div>
              </div>

              {/* Player 2 */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base md:text-lg truncate">{player2?.name || "TBD"}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">Sets: {session?.player2Sets || 0}</Badge>
                  </div>
                </div>
                <div className="text-4xl md:text-5xl font-bold tracking-tight ml-4">
                  {session?.player2CurrentScore || "0"}
                </div>
              </div>
            </div>

            {/* Start Session (if no session) - Desktop Only */}
            {!session && (
              <div className="text-center py-6 md:block hidden">
                <Button
                  size="lg"
                  onClick={() => startSessionMutation.mutate()}
                  disabled={startSessionMutation.isPending}
                  data-testid="button-start-session"
                  className="min-h-[56px]"
                >
                  <Clock className="h-5 w-5 mr-2" />
                  {startSessionMutation.isPending ? "Iniciando..." : "Iniciar captura"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Action Bar - Mobile */}
      {session ? (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 space-y-2 md:hidden max-h-[50vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="lg"
              onClick={async () => {
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
                
                const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                games1Array[newState.currentSet - 1] = newState.player1Games;
                games2Array[newState.currentSet - 1] = newState.player2Games;
                
                await updateScoreMutation.mutateAsync({
                  player1CurrentScore: newState.player1Score,
                  player2CurrentScore: newState.player2Score,
                  player1Sets: newState.player1Sets,
                  player2Sets: newState.player2Sets,
                  currentSet: newState.currentSet,
                  player1Games: JSON.stringify(games1Array),
                  player2Games: JSON.stringify(games2Array)
                });
                
                recordPointMutation.mutate({
                  playerId: match.player1Id,
                  player1Score: newState.player1Score,
                  player2Score: newState.player2Score
                });
              }}
              data-testid="button-point-player1"
              className="min-h-[52px] text-sm"
              disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
            >
              Punto {player1?.name?.split(' ')[0]}
            </Button>

            <Button
              size="lg"
              onClick={async () => {
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
                
                const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                games1Array[newState.currentSet - 1] = newState.player1Games;
                games2Array[newState.currentSet - 1] = newState.player2Games;
                
                await updateScoreMutation.mutateAsync({
                  player1CurrentScore: newState.player1Score,
                  player2CurrentScore: newState.player2Score,
                  player1Sets: newState.player1Sets,
                  player2Sets: newState.player2Sets,
                  currentSet: newState.currentSet,
                  player1Games: JSON.stringify(games1Array),
                  player2Games: JSON.stringify(games2Array)
                });
                
                recordPointMutation.mutate({
                  playerId: match.player2Id,
                  player1Score: newState.player1Score,
                  player2Score: newState.player2Score
                });
              }}
              data-testid="button-point-player2"
              className="min-h-[52px] text-sm"
              disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
            >
              Punto {player2?.name?.split(' ')[0]}
            </Button>
          </div>

          {/* Special events row */}
          <div className="grid grid-cols-6 gap-1.5 text-xs">
            {/* Player 1 special events */}
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
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
                
                const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                games1Array[newState.currentSet - 1] = newState.player1Games;
                games2Array[newState.currentSet - 1] = newState.player2Games;
                
                await updateScoreMutation.mutateAsync({
                  player1CurrentScore: newState.player1Score,
                  player2CurrentScore: newState.player2Score,
                  player1Sets: newState.player1Sets,
                  player2Sets: newState.player2Sets,
                  currentSet: newState.currentSet,
                  player1Games: JSON.stringify(games1Array),
                  player2Games: JSON.stringify(games2Array)
                });
                
                recordSpecialEventMutation.mutate({
                  eventType: "ace",
                  playerId: match.player1Id,
                  player1Score: newState.player1Score,
                  player2Score: newState.player2Score
                });
              }}
              className="min-h-[40px] p-1 flex flex-col items-center"
              disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
              data-testid="button-ace-player1"
            >
              <Zap className="h-3 w-3" />
              <span className="text-[10px]">Ace</span>
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
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
                
                const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                games1Array[newState.currentSet - 1] = newState.player1Games;
                games2Array[newState.currentSet - 1] = newState.player2Games;
                
                await updateScoreMutation.mutateAsync({
                  player1CurrentScore: newState.player1Score,
                  player2CurrentScore: newState.player2Score,
                  player1Sets: newState.player1Sets,
                  player2Sets: newState.player2Sets,
                  currentSet: newState.currentSet,
                  player1Games: JSON.stringify(games1Array),
                  player2Games: JSON.stringify(games2Array)
                });
                
                recordSpecialEventMutation.mutate({
                  eventType: "double_fault",
                  playerId: match.player1Id,
                  player1Score: newState.player1Score,
                  player2Score: newState.player2Score
                });
              }}
              className="min-h-[40px] p-1 flex flex-col items-center"
              disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
              data-testid="button-double-fault-player1"
            >
              <AlertTriangle className="h-3 w-3" />
              <span className="text-[10px]">D.F.</span>
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
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
                
                const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                games1Array[newState.currentSet - 1] = newState.player1Games;
                games2Array[newState.currentSet - 1] = newState.player2Games;
                
                await updateScoreMutation.mutateAsync({
                  player1CurrentScore: newState.player1Score,
                  player2CurrentScore: newState.player2Score,
                  player1Sets: newState.player1Sets,
                  player2Sets: newState.player2Sets,
                  currentSet: newState.currentSet,
                  player1Games: JSON.stringify(games1Array),
                  player2Games: JSON.stringify(games2Array)
                });
                
                recordSpecialEventMutation.mutate({
                  eventType: "error",
                  playerId: match.player1Id,
                  player1Score: newState.player1Score,
                  player2Score: newState.player2Score
                });
              }}
              className="min-h-[40px] p-1 flex flex-col items-center"
              disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
              data-testid="button-error-player1"
            >
              <X className="h-3 w-3" />
              <span className="text-[10px]">Error</span>
            </Button>

            {/* Player 2 special events */}
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
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
                
                const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                games1Array[newState.currentSet - 1] = newState.player1Games;
                games2Array[newState.currentSet - 1] = newState.player2Games;
                
                await updateScoreMutation.mutateAsync({
                  player1CurrentScore: newState.player1Score,
                  player2CurrentScore: newState.player2Score,
                  player1Sets: newState.player1Sets,
                  player2Sets: newState.player2Sets,
                  currentSet: newState.currentSet,
                  player1Games: JSON.stringify(games1Array),
                  player2Games: JSON.stringify(games2Array)
                });
                
                recordSpecialEventMutation.mutate({
                  eventType: "ace",
                  playerId: match.player2Id,
                  player1Score: newState.player1Score,
                  player2Score: newState.player2Score
                });
              }}
              className="min-h-[40px] p-1 flex flex-col items-center"
              disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
              data-testid="button-ace-player2"
            >
              <Zap className="h-3 w-3" />
              <span className="text-[10px]">Ace</span>
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
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
                
                const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                games1Array[newState.currentSet - 1] = newState.player1Games;
                games2Array[newState.currentSet - 1] = newState.player2Games;
                
                await updateScoreMutation.mutateAsync({
                  player1CurrentScore: newState.player1Score,
                  player2CurrentScore: newState.player2Score,
                  player1Sets: newState.player1Sets,
                  player2Sets: newState.player2Sets,
                  currentSet: newState.currentSet,
                  player1Games: JSON.stringify(games1Array),
                  player2Games: JSON.stringify(games2Array)
                });
                
                recordSpecialEventMutation.mutate({
                  eventType: "double_fault",
                  playerId: match.player2Id,
                  player1Score: newState.player1Score,
                  player2Score: newState.player2Score
                });
              }}
              className="min-h-[40px] p-1 flex flex-col items-center"
              disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
              data-testid="button-double-fault-player2"
            >
              <AlertTriangle className="h-3 w-3" />
              <span className="text-[10px]">D.F.</span>
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
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
                
                const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                games1Array[newState.currentSet - 1] = newState.player1Games;
                games2Array[newState.currentSet - 1] = newState.player2Games;
                
                await updateScoreMutation.mutateAsync({
                  player1CurrentScore: newState.player1Score,
                  player2CurrentScore: newState.player2Score,
                  player1Sets: newState.player1Sets,
                  player2Sets: newState.player2Sets,
                  currentSet: newState.currentSet,
                  player1Games: JSON.stringify(games1Array),
                  player2Games: JSON.stringify(games2Array)
                });
                
                recordSpecialEventMutation.mutate({
                  eventType: "error",
                  playerId: match.player2Id,
                  player1Score: newState.player1Score,
                  player2Score: newState.player2Score
                });
              }}
              className="min-h-[40px] p-1 flex flex-col items-center"
              disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
              data-testid="button-error-player2"
            >
              <X className="h-3 w-3" />
              <span className="text-[10px]">Error</span>
            </Button>
          </div>
          
          <Button
            variant="outline"
            className="w-full min-h-[44px]"
            onClick={() => completeSessionMutation.mutate()}
            disabled={completeSessionMutation.isPending}
            data-testid="button-complete-session"
          >
            Finalizar partido
          </Button>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 md:hidden">
          <Button
            size="lg"
            className="w-full min-h-[56px]"
            onClick={() => startSessionMutation.mutate()}
            disabled={startSessionMutation.isPending}
            data-testid="button-start-session"
          >
            <Clock className="h-5 w-5 mr-2" />
            {startSessionMutation.isPending ? "Iniciando..." : "Iniciar captura"}
          </Button>
        </div>
      )}

      {/* Desktop Action Buttons */}
      {session && (
        <div className="hidden md:block container mx-auto px-4 max-w-4xl">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Button
                  size="lg"
                  onClick={async () => {
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
                    
                    const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                    const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                    games1Array[newState.currentSet - 1] = newState.player1Games;
                    games2Array[newState.currentSet - 1] = newState.player2Games;
                    
                    await updateScoreMutation.mutateAsync({
                      player1CurrentScore: newState.player1Score,
                      player2CurrentScore: newState.player2Score,
                      player1Sets: newState.player1Sets,
                      player2Sets: newState.player2Sets,
                      currentSet: newState.currentSet,
                      player1Games: JSON.stringify(games1Array),
                      player2Games: JSON.stringify(games2Array)
                    });
                    
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
                    
                    const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                    const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                    games1Array[newState.currentSet - 1] = newState.player1Games;
                    games2Array[newState.currentSet - 1] = newState.player2Games;
                    
                    await updateScoreMutation.mutateAsync({
                      player1CurrentScore: newState.player1Score,
                      player2CurrentScore: newState.player2Score,
                      player1Sets: newState.player1Sets,
                      player2Sets: newState.player2Sets,
                      currentSet: newState.currentSet,
                      player1Games: JSON.stringify(games1Array),
                      player2Games: JSON.stringify(games2Array)
                    });
                    
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

              {/* Special events row - Desktop */}
              <div className="grid grid-cols-6 gap-3 mb-4">
                {/* Player 1 special events */}
                <Button
                  variant="secondary"
                  onClick={async () => {
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
                    
                    const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                    const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                    games1Array[newState.currentSet - 1] = newState.player1Games;
                    games2Array[newState.currentSet - 1] = newState.player2Games;
                    
                    await updateScoreMutation.mutateAsync({
                      player1CurrentScore: newState.player1Score,
                      player2CurrentScore: newState.player2Score,
                      player1Sets: newState.player1Sets,
                      player2Sets: newState.player2Sets,
                      currentSet: newState.currentSet,
                      player1Games: JSON.stringify(games1Array),
                      player2Games: JSON.stringify(games2Array)
                    });
                    
                    recordSpecialEventMutation.mutate({
                      eventType: "ace",
                      playerId: match.player1Id,
                      player1Score: newState.player1Score,
                      player2Score: newState.player2Score
                    });
                  }}
                  className="min-h-[50px] flex flex-col items-center justify-center gap-1"
                  disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
                  data-testid="button-ace-player1"
                >
                  <Zap className="h-4 w-4" />
                  <span className="text-xs">Ace {player1?.name?.split(' ')[0]}</span>
                </Button>

                <Button
                  variant="destructive"
                  onClick={async () => {
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
                    
                    const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                    const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                    games1Array[newState.currentSet - 1] = newState.player1Games;
                    games2Array[newState.currentSet - 1] = newState.player2Games;
                    
                    await updateScoreMutation.mutateAsync({
                      player1CurrentScore: newState.player1Score,
                      player2CurrentScore: newState.player2Score,
                      player1Sets: newState.player1Sets,
                      player2Sets: newState.player2Sets,
                      currentSet: newState.currentSet,
                      player1Games: JSON.stringify(games1Array),
                      player2Games: JSON.stringify(games2Array)
                    });
                    
                    recordSpecialEventMutation.mutate({
                      eventType: "double_fault",
                      playerId: match.player1Id,
                      player1Score: newState.player1Score,
                      player2Score: newState.player2Score
                    });
                  }}
                  className="min-h-[50px] flex flex-col items-center justify-center gap-1"
                  disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
                  data-testid="button-double-fault-player1"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">D.F. {player1?.name?.split(' ')[0]}</span>
                </Button>

                <Button
                  variant="destructive"
                  onClick={async () => {
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
                    
                    const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                    const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                    games1Array[newState.currentSet - 1] = newState.player1Games;
                    games2Array[newState.currentSet - 1] = newState.player2Games;
                    
                    await updateScoreMutation.mutateAsync({
                      player1CurrentScore: newState.player1Score,
                      player2CurrentScore: newState.player2Score,
                      player1Sets: newState.player1Sets,
                      player2Sets: newState.player2Sets,
                      currentSet: newState.currentSet,
                      player1Games: JSON.stringify(games1Array),
                      player2Games: JSON.stringify(games2Array)
                    });
                    
                    recordSpecialEventMutation.mutate({
                      eventType: "error",
                      playerId: match.player1Id,
                      player1Score: newState.player1Score,
                      player2Score: newState.player2Score
                    });
                  }}
                  className="min-h-[50px] flex flex-col items-center justify-center gap-1"
                  disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
                  data-testid="button-error-player1"
                >
                  <X className="h-4 w-4" />
                  <span className="text-xs">Error {player1?.name?.split(' ')[0]}</span>
                </Button>

                {/* Player 2 special events */}
                <Button
                  variant="secondary"
                  onClick={async () => {
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
                    
                    const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                    const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                    games1Array[newState.currentSet - 1] = newState.player1Games;
                    games2Array[newState.currentSet - 1] = newState.player2Games;
                    
                    await updateScoreMutation.mutateAsync({
                      player1CurrentScore: newState.player1Score,
                      player2CurrentScore: newState.player2Score,
                      player1Sets: newState.player1Sets,
                      player2Sets: newState.player2Sets,
                      currentSet: newState.currentSet,
                      player1Games: JSON.stringify(games1Array),
                      player2Games: JSON.stringify(games2Array)
                    });
                    
                    recordSpecialEventMutation.mutate({
                      eventType: "ace",
                      playerId: match.player2Id,
                      player1Score: newState.player1Score,
                      player2Score: newState.player2Score
                    });
                  }}
                  className="min-h-[50px] flex flex-col items-center justify-center gap-1"
                  disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
                  data-testid="button-ace-player2"
                >
                  <Zap className="h-4 w-4" />
                  <span className="text-xs">Ace {player2?.name?.split(' ')[0]}</span>
                </Button>

                <Button
                  variant="destructive"
                  onClick={async () => {
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
                    
                    const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                    const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                    games1Array[newState.currentSet - 1] = newState.player1Games;
                    games2Array[newState.currentSet - 1] = newState.player2Games;
                    
                    await updateScoreMutation.mutateAsync({
                      player1CurrentScore: newState.player1Score,
                      player2CurrentScore: newState.player2Score,
                      player1Sets: newState.player1Sets,
                      player2Sets: newState.player2Sets,
                      currentSet: newState.currentSet,
                      player1Games: JSON.stringify(games1Array),
                      player2Games: JSON.stringify(games2Array)
                    });
                    
                    recordSpecialEventMutation.mutate({
                      eventType: "double_fault",
                      playerId: match.player2Id,
                      player1Score: newState.player1Score,
                      player2Score: newState.player2Score
                    });
                  }}
                  className="min-h-[50px] flex flex-col items-center justify-center gap-1"
                  disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
                  data-testid="button-double-fault-player2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">D.F. {player2?.name?.split(' ')[0]}</span>
                </Button>

                <Button
                  variant="destructive"
                  onClick={async () => {
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
                    
                    const games1Array = session.player1Games ? JSON.parse(session.player1Games) : [];
                    const games2Array = session.player2Games ? JSON.parse(session.player2Games) : [];
                    games1Array[newState.currentSet - 1] = newState.player1Games;
                    games2Array[newState.currentSet - 1] = newState.player2Games;
                    
                    await updateScoreMutation.mutateAsync({
                      player1CurrentScore: newState.player1Score,
                      player2CurrentScore: newState.player2Score,
                      player1Sets: newState.player1Sets,
                      player2Sets: newState.player2Sets,
                      currentSet: newState.currentSet,
                      player1Games: JSON.stringify(games1Array),
                      player2Games: JSON.stringify(games2Array)
                    });
                    
                    recordSpecialEventMutation.mutate({
                      eventType: "error",
                      playerId: match.player2Id,
                      player1Score: newState.player1Score,
                      player2Score: newState.player2Score
                    });
                  }}
                  className="min-h-[50px] flex flex-col items-center justify-center gap-1"
                  disabled={updateScoreMutation.isPending || recordPointMutation.isPending || recordSpecialEventMutation.isPending}
                  data-testid="button-error-player2"
                >
                  <X className="h-4 w-4" />
                  <span className="text-xs">Error {player2?.name?.split(' ')[0]}</span>
                </Button>
              </div>

              <div className="flex justify-center">
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
