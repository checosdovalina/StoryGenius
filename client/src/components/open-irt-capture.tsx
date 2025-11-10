import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { calculateOpenIRTScore, type OpenIRTScoreState } from "@/lib/scoring";
import type { Match, MatchStatsSession, User } from "@shared/schema";
import { Clock, Zap, AlertTriangle, X } from "lucide-react";

interface OpenIRTCaptureProps {
  match: Match;
  session: MatchStatsSession;
  player1: User;
  player2: User;
  player3?: User;
  player4?: User;
  onSessionUpdate: (session: MatchStatsSession) => void;
  onEndSession?: () => void;
}

export function OpenIRTCapture({ match, session, player1, player2, player3, player4, onSessionUpdate, onEndSession }: OpenIRTCaptureProps) {
  const { toast } = useToast();
  
  // Active player state for doubles (tracks which of the 4 players is currently acting)
  const [activeServingPlayerId, setActiveServingPlayerId] = useState<string>(session.serverId || match.player1Id);
  const [activeReceivingPlayerId, setActiveReceivingPlayerId] = useState<string>(
    match.player2Id
  );

  // Local scoring state
  const [scoreState, setScoreState] = useState<OpenIRTScoreState>({
    player1Score: parseInt(session.player1CurrentScore || "0"),
    player2Score: parseInt(session.player2CurrentScore || "0"),
    player1Sets: session.player1Sets || 0,
    player2Sets: session.player2Sets || 0,
    currentSet: session.currentSet || 1,
    serverId: session.serverId || match.player1Id,
    player1Id: match.player1Id,
    player2Id: match.player2Id
  });

  // Timeout state
  const [timeoutActive, setTimeoutActive] = useState(false);
  const [timeoutRemaining, setTimeoutRemaining] = useState(60);

  // Determine if this is a doubles match
  const isDoubles = session.matchType === "doubles";

  // Get team members (for doubles)
  const team1Players = isDoubles && player3 ? [player1, player3] : [player1];
  const team2Players = isDoubles && player4 ? [player2, player4] : [player2];

  // Determine which team is serving
  const isTeam1Serving = scoreState.serverId === match.player1Id || (match.player3Id && scoreState.serverId === match.player3Id);
  
  // Get current serving/receiving team players
  const servingTeamPlayers = isTeam1Serving ? team1Players : team2Players;
  const receivingTeamPlayers = isTeam1Serving ? team2Players : team1Players;

  // Update local state when session updates
  useEffect(() => {
    const matchWinner = session.matchWinner 
      ? (session.matchWinner === match.player1Id ? "player1" : "player2")
      : undefined;
    
    setScoreState({
      player1Score: parseInt(session.player1CurrentScore || "0"),
      player2Score: parseInt(session.player2CurrentScore || "0"),
      player1Sets: session.player1Sets || 0,
      player2Sets: session.player2Sets || 0,
      currentSet: session.currentSet || 1,
      serverId: session.serverId || match.player1Id,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      matchWinner
    });
  }, [session, match]);

  // Reset active player IDs when server changes (sideout)
  useEffect(() => {
    if (!isDoubles) return; // Only needed for doubles
    
    // Determine which team is currently serving
    const currentIsTeam1Serving = scoreState.serverId === match.player1Id || (match.player3Id && scoreState.serverId === match.player3Id);
    
    // Set active serving player to first player in serving team
    const firstServingPlayer = currentIsTeam1Serving ? match.player1Id : match.player2Id;
    setActiveServingPlayerId(firstServingPlayer);
    
    // Set active receiving player to first player in receiving team
    const firstReceivingPlayer = currentIsTeam1Serving ? match.player2Id : match.player1Id;
    setActiveReceivingPlayerId(firstReceivingPlayer);
  }, [scoreState.serverId, match.player1Id, match.player2Id, match.player3Id, match.player4Id, isDoubles]);

  // Timeout timer
  useEffect(() => {
    if (!timeoutActive) return;

    const timer = setInterval(() => {
      setTimeoutRemaining((prev) => {
        if (prev <= 1) {
          setTimeoutActive(false);
          toast({ title: "Tiempo fuera terminado", description: "El minuto ha concluido" });
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeoutActive, toast]);

  // Get current set timeouts and appellations from session
  const getCurrentSetIndex = () => session.currentSet! - 1;
  
  const getPlayer1TimeoutsUsed = () => {
    const timeouts = JSON.parse(session.player1TimeoutsUsed || "[]");
    return timeouts[getCurrentSetIndex()] || 0;
  };

  const getPlayer2TimeoutsUsed = () => {
    const timeouts = JSON.parse(session.player2TimeoutsUsed || "[]");
    return timeouts[getCurrentSetIndex()] || 0;
  };

  const getPlayer1AppellationsUsed = () => {
    const appellations = JSON.parse(session.player1AppellationsUsed || "[]");
    return appellations[getCurrentSetIndex()] || 0;
  };

  const getPlayer2AppellationsUsed = () => {
    const appellations = JSON.parse(session.player2AppellationsUsed || "[]");
    return appellations[getCurrentSetIndex()] || 0;
  };

  // Record event mutation
  const recordEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/stats/sessions/${session.id}/events`, {
        ...data,
        setNumber: scoreState.currentSet,
        player1Score: scoreState.player1Score.toString(),
        player2Score: scoreState.player2Score.toString()
      });
      return await response.json();
    },
    onError: () => {
      toast({ title: "Error al registrar evento", variant: "destructive" });
    }
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (updates: Partial<MatchStatsSession>) => {
      const response = await apiRequest("PUT", `/api/stats/sessions/${session.id}`, updates);
      return await response.json();
    },
    onSuccess: (data) => {
      onSessionUpdate(data);
    }
  });

  // Handle point with shot type
  const handlePoint = (playerId: string, shotType: "recto" | "esquina" | "cruzado" | "punto") => {
    // Don't allow scoring if match is already won
    if (scoreState.matchWinner) {
      toast({ 
        title: "Partido terminado", 
        description: "El partido ya ha finalizado",
        variant: "destructive"
      });
      return;
    }

    // Determine which team won the point (team1 or team2)
    const isTeam1Player = playerId === match.player1Id || (match.player3Id && playerId === match.player3Id);
    const pointWinner = isTeam1Player ? "player1" : "player2";
    const newState = calculateOpenIRTScore(scoreState, pointWinner);
    
    setScoreState(newState);

    // Record event (with specific playerId for individual stats)
    recordEventMutation.mutate({
      eventType: "point_won",
      playerId,
      shotType
    });

    // Update session
    updateSessionMutation.mutate({
      player1CurrentScore: newState.player1Score.toString(),
      player2CurrentScore: newState.player2Score.toString(),
      player1Sets: newState.player1Sets,
      player2Sets: newState.player2Sets,
      currentSet: newState.currentSet,
      serverId: newState.serverId,
      matchWinner: newState.matchWinner ? (newState.matchWinner === "player1" ? match.player1Id : match.player2Id) : null
    });

    if (newState.serverChanged) {
      toast({ 
        title: "Cambio de saque", 
        description: "El recibidor gana el punto y pasa a sacar" 
      });
    }

    if (newState.setWinner) {
      const winnerTeamName = newState.setWinner === "player1" 
        ? (isDoubles ? `${player1.name} & ${player3?.name}` : player1.name)
        : (isDoubles ? `${player2.name} & ${player4?.name}` : player2.name);
      toast({ 
        title: "¡Set ganado!", 
        description: `${winnerTeamName} gana el set` 
      });
    }

    if (newState.matchWinner) {
      toast({ 
        title: "¡Partido terminado!", 
        description: `${newState.matchWinner === "player1" ? player1.name : player2.name} gana el partido`,
        duration: 5000
      });
    }
  };

  // Handle ace
  const handleAce = (playerId: string, side: "derecha" | "izquierda") => {
    // Don't allow scoring if match is already won
    if (scoreState.matchWinner) {
      toast({ 
        title: "Partido terminado", 
        description: "El partido ya ha finalizado",
        variant: "destructive"
      });
      return;
    }

    // Determine which team won the point (team1 or team2)
    const isTeam1Player = playerId === match.player1Id || (match.player3Id && playerId === match.player3Id);
    const pointWinner = isTeam1Player ? "player1" : "player2";
    const newState = calculateOpenIRTScore(scoreState, pointWinner);
    
    setScoreState(newState);

    recordEventMutation.mutate({
      eventType: "ace",
      playerId,
      aceSide: side
    });

    updateSessionMutation.mutate({
      player1CurrentScore: newState.player1Score.toString(),
      player2CurrentScore: newState.player2Score.toString(),
      player1Sets: newState.player1Sets,
      player2Sets: newState.player2Sets,
      currentSet: newState.currentSet,
      serverId: newState.serverId,
      matchWinner: newState.matchWinner ? (newState.matchWinner === "player1" ? match.player1Id : match.player2Id) : null
    });

    toast({ title: `Ace ${side}!` });
  };

  // Handle double fault
  const handleDoubleFault = (playerId: string) => {
    // Don't allow scoring if match is already won
    if (scoreState.matchWinner) {
      toast({ 
        title: "Partido terminado", 
        description: "El partido ya ha finalizado",
        variant: "destructive"
      });
      return;
    }

    // Double fault gives point to opponent team
    const isTeam1Player = playerId === match.player1Id || (match.player3Id && playerId === match.player3Id);
    const opponent = isTeam1Player ? "player2" : "player1";
    const newState = calculateOpenIRTScore(scoreState, opponent);
    
    setScoreState(newState);

    recordEventMutation.mutate({
      eventType: "double_fault",
      playerId
    });

    updateSessionMutation.mutate({
      player1CurrentScore: newState.player1Score.toString(),
      player2CurrentScore: newState.player2Score.toString(),
      player1Sets: newState.player1Sets,
      player2Sets: newState.player2Sets,
      currentSet: newState.currentSet,
      serverId: newState.serverId,
      matchWinner: newState.matchWinner ? (newState.matchWinner === "player1" ? match.player1Id : match.player2Id) : null
    });

    toast({ title: "Doble falta", variant: "destructive" });
  };

  // Handle timeout
  const handleTimeout = (playerId: string) => {
    const isTeam1Player = playerId === match.player1Id || (match.player3Id && playerId === match.player3Id);
    const timeoutsUsed = isTeam1Player ? getPlayer1TimeoutsUsed() : getPlayer2TimeoutsUsed();

    if (timeoutsUsed >= 1) {
      toast({ 
        title: "No disponible", 
        description: "Ya se usó el tiempo fuera de este set",
        variant: "destructive"
      });
      return;
    }

    const timeoutsArray = JSON.parse(
      isTeam1Player ? session.player1TimeoutsUsed! : session.player2TimeoutsUsed!
    );
    timeoutsArray[getCurrentSetIndex()] = (timeoutsArray[getCurrentSetIndex()] || 0) + 1;

    recordEventMutation.mutate({
      eventType: "timeout",
      playerId
    });

    updateSessionMutation.mutate(
      isTeam1Player 
        ? { player1TimeoutsUsed: JSON.stringify(timeoutsArray), timeoutStartedAt: new Date() as any, timeoutPlayerId: playerId }
        : { player2TimeoutsUsed: JSON.stringify(timeoutsArray), timeoutStartedAt: new Date() as any, timeoutPlayerId: playerId }
    );

    setTimeoutActive(true);
    setTimeoutRemaining(60);
    toast({ title: "Tiempo fuera iniciado", description: "1 minuto" });
  };

  // Handle appellation
  const handleAppellation = (playerId: string, result: "ganada" | "perdida") => {
    const isTeam1Player = playerId === match.player1Id || (match.player3Id && playerId === match.player3Id);
    const appellationsUsed = isTeam1Player ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed();

    const appellationsArray = JSON.parse(
      isTeam1Player ? session.player1AppellationsUsed! : session.player2AppellationsUsed!
    );

    // Only increment if lost
    if (result === "perdida") {
      appellationsArray[getCurrentSetIndex()] = (appellationsArray[getCurrentSetIndex()] || 0) + 1;
    }

    recordEventMutation.mutate({
      eventType: "appellation",
      playerId,
      appellationResult: result
    });

    updateSessionMutation.mutate(
      isTeam1Player 
        ? { player1AppellationsUsed: JSON.stringify(appellationsArray) }
        : { player2AppellationsUsed: JSON.stringify(appellationsArray) }
    );

    toast({ 
      title: result === "ganada" ? "Apelación ganada" : "Apelación perdida",
      description: result === "perdida" ? `Quedan ${3 - (appellationsUsed + 1)} apelaciones` : "Mantiene sus apelaciones"
    });
  };

  // Handle technical
  const handleTechnical = (playerId: string) => {
    const isTeam1Player = playerId === match.player1Id || (match.player3Id && playerId === match.player3Id);
    const currentTechnicals = isTeam1Player ? session.player1Technicals! : session.player2Technicals!;
    const newTechnicals = currentTechnicals + 1;

    // Subtract point (technical penalty)
    const newScore = { ...scoreState };
    if (isTeam1Player) {
      newScore.player1Score = Math.max(0, newScore.player1Score - 1);
    } else {
      newScore.player2Score = Math.max(0, newScore.player2Score - 1);
    }

    setScoreState(newScore);

    recordEventMutation.mutate({
      eventType: "technical",
      playerId
    });

    const updates: any = isTeam1Player
      ? { 
          player1Technicals: newTechnicals,
          player1CurrentScore: newScore.player1Score.toString()
        }
      : { 
          player2Technicals: newTechnicals,
          player2CurrentScore: newScore.player2Score.toString()
        };

    // Check if match should end
    if (newTechnicals >= 3) {
      updates.matchEndedByTechnical = true;
      updates.status = "completed";
      const losingTeamName = isTeam1Player
        ? (isDoubles ? `${player1.name} & ${player3?.name}` : player1.name)
        : (isDoubles ? `${player2.name} & ${player4?.name}` : player2.name);
      toast({ 
        title: "¡Partido terminado!", 
        description: `${losingTeamName} pierde por técnico`,
        variant: "destructive",
        duration: 5000
      });
    } else {
      toast({ 
        title: "Técnico", 
        description: `${newTechnicals}/3 - Se resta un punto`,
        variant: "destructive"
      });
    }

    updateSessionMutation.mutate(updates);
  };

  const isPlayer1Serving = scoreState.serverId === match.player1Id || (match.player3Id && scoreState.serverId === match.player3Id);

  return (
    <div className="min-h-screen w-full bg-background p-2 sm:p-4 space-y-3 overflow-y-auto">
      {/* Timeout Timer */}
      {timeoutActive && (
        <Card className="bg-orange-500 border-orange-600">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-white">
              <Clock className="h-6 w-6" />
              <span className="text-2xl font-bold">{Math.floor(timeoutRemaining / 60)}:{String(timeoutRemaining % 60).padStart(2, '0')}</span>
            </div>
            <p className="text-white text-sm mt-1">Tiempo fuera en curso</p>
          </CardContent>
        </Card>
      )}

      {/* Server Panel */}
      <Card className="bg-green-50 border-green-500 border-2">
        <CardContent className="p-3 sm:p-4">
          <div className="text-center mb-3">
            {isDoubles ? (
              <>
                <h3 className="font-bold text-xl sm:text-2xl">
                  Equipo {isTeam1Serving ? "1" : "2"}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground font-medium">Sacando</p>
                <div className="mt-2 flex gap-2 justify-center">
                  {servingTeamPlayers.map((player) => (
                    <Button
                      key={player.id}
                      onClick={() => setActiveServingPlayerId(player.id)}
                      variant={activeServingPlayerId === player.id ? "default" : "outline"}
                      size="sm"
                      className="min-w-[100px]"
                      data-testid={`button-select-server-${player.id}`}
                    >
                      {player.name}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-xl sm:text-2xl">
                  {servingTeamPlayers[0].name}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground font-medium">Sacando</p>
              </>
            )}
          </div>

          {/* Shot type buttons */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <Button
              onClick={() => handlePoint(isDoubles ? activeServingPlayerId : scoreState.serverId, "recto")}
              className="bg-green-600 hover:bg-green-700 min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-shot-recto"
            >
              Recto
            </Button>
            <Button
              onClick={() => handlePoint(isDoubles ? activeServingPlayerId : scoreState.serverId, "esquina")}
              className="bg-green-600 hover:bg-green-700 min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-shot-esquina"
            >
              Esquina
            </Button>
            <Button
              onClick={() => handlePoint(isDoubles ? activeServingPlayerId : scoreState.serverId, "cruzado")}
              className="bg-green-600 hover:bg-green-700 min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-shot-cruzado"
            >
              Cruzado
            </Button>
            <Button
              onClick={() => handlePoint(isDoubles ? activeServingPlayerId : scoreState.serverId, "punto")}
              className="bg-green-600 hover:bg-green-700 min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-shot-punto"
            >
              Punto
            </Button>
          </div>

          {/* Ace buttons */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Button
              onClick={() => handleAce(isDoubles ? activeServingPlayerId : scoreState.serverId, "derecha")}
              variant="secondary"
              className="min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-ace-derecha"
            >
              <Zap className="h-5 w-5 mr-1" />
              Derecha
            </Button>
            <Button
              onClick={() => handleAce(isDoubles ? activeServingPlayerId : scoreState.serverId, "izquierda")}
              variant="secondary"
              className="min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-ace-izquierda"
            >
              <Zap className="h-5 w-5 mr-1" />
              Izquierda
            </Button>
            <Button
              onClick={() => handleDoubleFault(isDoubles ? activeServingPlayerId : scoreState.serverId)}
              variant="destructive"
              className="min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-double-fault"
            >
              D.F.
            </Button>
          </div>

          {/* Timeout button */}
          <Button
            onClick={() => handleTimeout(isDoubles ? activeServingPlayerId : scoreState.serverId)}
            variant="outline"
            className="w-full mb-3 min-h-[52px] sm:min-h-[60px] text-base sm:text-lg font-semibold"
            disabled={!!scoreState.matchWinner || (isPlayer1Serving ? getPlayer1TimeoutsUsed() >= 1 : getPlayer2TimeoutsUsed() >= 1)}
            data-testid="button-timeout"
          >
            <Clock className="h-5 w-5 mr-2" />
            Tiempo Fuera
            {(isPlayer1Serving ? getPlayer1TimeoutsUsed() : getPlayer2TimeoutsUsed()) >= 1 && " (Usado)"}
          </Button>

          {/* Appellation and Technical */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <p className="text-sm sm:text-base text-center font-semibold">Apelación</p>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  onClick={() => handleAppellation(isDoubles ? activeServingPlayerId : scoreState.serverId, "ganada")}
                  variant="outline"
                  className="min-h-[48px] sm:min-h-[56px] text-sm sm:text-base font-semibold"
                  disabled={!!scoreState.matchWinner || (isPlayer1Serving ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed()) >= 3}
                  data-testid="button-appellation-won"
                >
                  Ganada
                </Button>
                <Button
                  onClick={() => handleAppellation(isDoubles ? activeServingPlayerId : scoreState.serverId, "perdida")}
                  variant="outline"
                  className="min-h-[48px] sm:min-h-[56px] text-sm sm:text-base font-semibold"
                  disabled={!!scoreState.matchWinner || (isPlayer1Serving ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed()) >= 3}
                  data-testid="button-appellation-lost"
                >
                  Perdida
                </Button>
              </div>
              <Badge variant="outline" className="w-full justify-center text-sm sm:text-base py-1">
                {3 - (isPlayer1Serving ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed())} restantes
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm sm:text-base text-center font-semibold">Técnico</p>
              <Button
                onClick={() => handleTechnical(isDoubles ? activeServingPlayerId : scoreState.serverId)}
                variant="destructive"
                className="w-full min-h-[48px] sm:min-h-[56px] text-3xl sm:text-4xl font-bold"
                disabled={!!scoreState.matchWinner}
                data-testid="button-technical"
              >
                {isPlayer1Serving ? session.player1Technicals : session.player2Technicals}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Display */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-500 border-0 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            <div className="text-center flex-1">
              <p className="text-white text-sm sm:text-base font-semibold mb-1 truncate">{player1.name}</p>
              <p className="text-white text-6xl sm:text-7xl font-bold">{scoreState.player1Score}</p>
              <p className="text-white text-sm sm:text-base mt-1">Sets: {scoreState.player1Sets}</p>
            </div>
            <div className="text-white text-3xl sm:text-4xl font-bold">VS</div>
            <div className="text-center flex-1">
              <p className="text-white text-sm sm:text-base font-semibold mb-1 truncate">{player2.name}</p>
              <p className="text-white text-6xl sm:text-7xl font-bold">{scoreState.player2Score}</p>
              <p className="text-white text-sm sm:text-base mt-1">Sets: {scoreState.player2Sets}</p>
            </div>
          </div>
          <p className="text-center text-white text-base sm:text-lg font-semibold mt-3 sm:mt-4">Set {scoreState.currentSet}</p>
          
          {/* Match Winner Banner */}
          {scoreState.matchWinner && (
            <div className="mt-4 p-4 bg-white rounded-lg">
              <p className="text-center text-2xl sm:text-3xl font-bold text-green-600 mb-4">
                🏆 {scoreState.matchWinner === "player1" ? player1.name : player2.name} gana el partido!
              </p>
              {onEndSession && (
                <Button 
                  onClick={onEndSession}
                  className="w-full min-h-[56px] sm:min-h-[64px] text-lg sm:text-xl font-bold bg-green-600 hover:bg-green-700"
                  data-testid="button-end-session"
                >
                  Finalizar Sesión
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receiver Panel */}
      <Card className="bg-red-50 border-red-500 border-2">
        <CardContent className="p-3 sm:p-4">
          <div className="text-center mb-3">
            {isDoubles ? (
              <>
                <h3 className="font-bold text-xl sm:text-2xl">
                  Equipo {isTeam1Serving ? "2" : "1"}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground font-medium">Recibiendo</p>
                <div className="mt-2 flex gap-2 justify-center">
                  {receivingTeamPlayers.map((player) => (
                    <Button
                      key={player.id}
                      onClick={() => setActiveReceivingPlayerId(player.id)}
                      variant={activeReceivingPlayerId === player.id ? "default" : "outline"}
                      size="sm"
                      className="min-w-[100px]"
                      data-testid={`button-select-receiver-${player.id}`}
                    >
                      {player.name}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-xl sm:text-2xl">
                  {receivingTeamPlayers[0].name}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground font-medium">Recibiendo</p>
              </>
            )}
          </div>

          {/* Shot type buttons */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <Button
              onClick={() => handlePoint(isDoubles ? activeReceivingPlayerId : (isPlayer1Serving ? match.player2Id : match.player1Id), "recto")}
              className="bg-red-600 hover:bg-red-700 min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-receiver-shot-recto"
            >
              Recto
            </Button>
            <Button
              onClick={() => handlePoint(isDoubles ? activeReceivingPlayerId : (isPlayer1Serving ? match.player2Id : match.player1Id), "esquina")}
              className="bg-red-600 hover:bg-red-700 min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-receiver-shot-esquina"
            >
              Esquina
            </Button>
            <Button
              onClick={() => handlePoint(isDoubles ? activeReceivingPlayerId : (isPlayer1Serving ? match.player2Id : match.player1Id), "cruzado")}
              className="bg-red-600 hover:bg-red-700 min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-receiver-shot-cruzado"
            >
              Cruzado
            </Button>
            <Button
              onClick={() => handlePoint(isDoubles ? activeReceivingPlayerId : (isPlayer1Serving ? match.player2Id : match.player1Id), "punto")}
              className="bg-red-600 hover:bg-red-700 min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-receiver-shot-punto"
            >
              Punto
            </Button>
          </div>

          {/* Ace buttons */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Button
              onClick={() => handleAce(isDoubles ? activeReceivingPlayerId : (isPlayer1Serving ? match.player2Id : match.player1Id), "derecha")}
              variant="secondary"
              className="min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-receiver-ace-derecha"
            >
              <Zap className="h-5 w-5 mr-1" />
              Derecha
            </Button>
            <Button
              onClick={() => handleAce(isDoubles ? activeReceivingPlayerId : (isPlayer1Serving ? match.player2Id : match.player1Id), "izquierda")}
              variant="secondary"
              className="min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-receiver-ace-izquierda"
            >
              <Zap className="h-5 w-5 mr-1" />
              Izquierda
            </Button>
            <Button
              onClick={() => handleDoubleFault(isDoubles ? activeReceivingPlayerId : (isPlayer1Serving ? match.player2Id : match.player1Id))}
              variant="destructive"
              className="min-h-[56px] sm:min-h-[64px] text-base sm:text-lg font-semibold"
              disabled={!!scoreState.matchWinner}
              data-testid="button-receiver-double-fault"
            >
              D.F.
            </Button>
          </div>

          {/* Timeout button */}
          <Button
            onClick={() => handleTimeout(isPlayer1Serving ? match.player2Id : match.player1Id)}
            variant="outline"
            className="w-full mb-3 min-h-[52px] sm:min-h-[60px] text-base sm:text-lg font-semibold"
            disabled={!!scoreState.matchWinner || (!isPlayer1Serving ? getPlayer1TimeoutsUsed() >= 1 : getPlayer2TimeoutsUsed() >= 1)}
            data-testid="button-receiver-timeout"
          >
            <Clock className="h-5 w-5 mr-2" />
            Tiempo Fuera
            {(!isPlayer1Serving ? getPlayer1TimeoutsUsed() : getPlayer2TimeoutsUsed()) >= 1 && " (Usado)"}
          </Button>

          {/* Appellation and Technical */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <p className="text-sm sm:text-base text-center font-semibold">Apelación</p>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  onClick={() => handleAppellation(isPlayer1Serving ? match.player2Id : match.player1Id, "ganada")}
                  variant="outline"
                  className="min-h-[48px] sm:min-h-[56px] text-sm sm:text-base font-semibold"
                  disabled={!!scoreState.matchWinner || (!isPlayer1Serving ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed()) >= 3}
                  data-testid="button-receiver-appellation-won"
                >
                  Ganada
                </Button>
                <Button
                  onClick={() => handleAppellation(isPlayer1Serving ? match.player2Id : match.player1Id, "perdida")}
                  variant="outline"
                  className="min-h-[48px] sm:min-h-[56px] text-sm sm:text-base font-semibold"
                  disabled={!!scoreState.matchWinner || (!isPlayer1Serving ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed()) >= 3}
                  data-testid="button-receiver-appellation-lost"
                >
                  Perdida
                </Button>
              </div>
              <Badge variant="outline" className="w-full justify-center text-sm sm:text-base py-1">
                {3 - (!isPlayer1Serving ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed())} restantes
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm sm:text-base text-center font-semibold">Técnico</p>
              <Button
                onClick={() => handleTechnical(isPlayer1Serving ? match.player2Id : match.player1Id)}
                variant="destructive"
                className="w-full min-h-[48px] sm:min-h-[56px] text-3xl sm:text-4xl font-bold"
                disabled={!!scoreState.matchWinner}
                data-testid="button-receiver-technical"
              >
                {!isPlayer1Serving ? session.player1Technicals : session.player2Technicals}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
