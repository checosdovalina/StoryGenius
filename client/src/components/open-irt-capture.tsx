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
  onSessionUpdate: (session: MatchStatsSession) => void;
}

export function OpenIRTCapture({ match, session, player1, player2, onSessionUpdate }: OpenIRTCaptureProps) {
  const { toast } = useToast();
  
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

  // Update local state when session updates
  useEffect(() => {
    setScoreState({
      player1Score: parseInt(session.player1CurrentScore || "0"),
      player2Score: parseInt(session.player2CurrentScore || "0"),
      player1Sets: session.player1Sets || 0,
      player2Sets: session.player2Sets || 0,
      currentSet: session.currentSet || 1,
      serverId: session.serverId || match.player1Id,
      player1Id: match.player1Id,
      player2Id: match.player2Id
    });
  }, [session, match]);

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
    const pointWinner = playerId === match.player1Id ? "player1" : "player2";
    const newState = calculateOpenIRTScore(scoreState, pointWinner);
    
    setScoreState(newState);

    // Record event
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
      serverId: newState.serverId
    });

    if (newState.serverChanged) {
      toast({ 
        title: "Cambio de saque", 
        description: "El recibidor gana el punto y pasa a sacar" 
      });
    }

    if (newState.setWinner) {
      toast({ 
        title: "¡Set ganado!", 
        description: `${newState.setWinner === "player1" ? player1.name : player2.name} gana el set` 
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
    const pointWinner = playerId === match.player1Id ? "player1" : "player2";
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
      serverId: newState.serverId
    });

    toast({ title: `Ace ${side}!` });
  };

  // Handle double fault
  const handleDoubleFault = (playerId: string) => {
    // Double fault gives point to opponent
    const opponent = playerId === match.player1Id ? "player2" : "player1";
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
      serverId: newState.serverId
    });

    toast({ title: "Doble falta", variant: "destructive" });
  };

  // Handle timeout
  const handleTimeout = (playerId: string) => {
    const isPlayer1 = playerId === match.player1Id;
    const timeoutsUsed = isPlayer1 ? getPlayer1TimeoutsUsed() : getPlayer2TimeoutsUsed();

    if (timeoutsUsed >= 1) {
      toast({ 
        title: "No disponible", 
        description: "Ya se usó el tiempo fuera de este set",
        variant: "destructive"
      });
      return;
    }

    const timeoutsArray = JSON.parse(
      isPlayer1 ? session.player1TimeoutsUsed! : session.player2TimeoutsUsed!
    );
    timeoutsArray[getCurrentSetIndex()] = (timeoutsArray[getCurrentSetIndex()] || 0) + 1;

    recordEventMutation.mutate({
      eventType: "timeout",
      playerId
    });

    updateSessionMutation.mutate(
      isPlayer1 
        ? { player1TimeoutsUsed: JSON.stringify(timeoutsArray), timeoutStartedAt: new Date() as any, timeoutPlayerId: playerId }
        : { player2TimeoutsUsed: JSON.stringify(timeoutsArray), timeoutStartedAt: new Date() as any, timeoutPlayerId: playerId }
    );

    setTimeoutActive(true);
    setTimeoutRemaining(60);
    toast({ title: "Tiempo fuera iniciado", description: "1 minuto" });
  };

  // Handle appellation
  const handleAppellation = (playerId: string, result: "ganada" | "perdida") => {
    const isPlayer1 = playerId === match.player1Id;
    const appellationsUsed = isPlayer1 ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed();

    const appellationsArray = JSON.parse(
      isPlayer1 ? session.player1AppellationsUsed! : session.player2AppellationsUsed!
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
      isPlayer1 
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
    const isPlayer1 = playerId === match.player1Id;
    const currentTechnicals = isPlayer1 ? session.player1Technicals! : session.player2Technicals!;
    const newTechnicals = currentTechnicals + 1;

    // Subtract point (technical penalty)
    const newScore = { ...scoreState };
    if (isPlayer1) {
      newScore.player1Score = Math.max(0, newScore.player1Score - 1);
    } else {
      newScore.player2Score = Math.max(0, newScore.player2Score - 1);
    }

    setScoreState(newScore);

    recordEventMutation.mutate({
      eventType: "technical",
      playerId
    });

    const updates: any = isPlayer1
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
      toast({ 
        title: "¡Partido terminado!", 
        description: `${isPlayer1 ? player1.name : player2.name} pierde por técnico`,
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

  const isPlayer1Serving = scoreState.serverId === match.player1Id;

  return (
    <div className="max-w-md mx-auto space-y-4 p-4">
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
      <Card className={isPlayer1Serving ? "bg-green-50 border-green-500 border-2" : "bg-green-50 border-green-500 border-2"}>
        <CardContent className="p-4">
          <div className="text-center mb-3">
            <h3 className="font-bold text-lg">{isPlayer1Serving ? player1.name : player2.name}</h3>
            <p className="text-sm text-muted-foreground">Punto jugador sacando</p>
          </div>

          {/* Shot type buttons */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <Button
              onClick={() => handlePoint(scoreState.serverId, "recto")}
              className="bg-green-600 hover:bg-green-700 min-h-[44px]"
              size="sm"
              data-testid="button-shot-recto"
            >
              Recto
            </Button>
            <Button
              onClick={() => handlePoint(scoreState.serverId, "esquina")}
              className="bg-green-600 hover:bg-green-700 min-h-[44px]"
              size="sm"
              data-testid="button-shot-esquina"
            >
              Esquina
            </Button>
            <Button
              onClick={() => handlePoint(scoreState.serverId, "cruzado")}
              className="bg-green-600 hover:bg-green-700 min-h-[44px]"
              size="sm"
              data-testid="button-shot-cruzado"
            >
              Cruzado
            </Button>
            <Button
              onClick={() => handlePoint(scoreState.serverId, "punto")}
              className="bg-green-600 hover:bg-green-700 min-h-[44px]"
              size="sm"
              data-testid="button-shot-punto"
            >
              Punto
            </Button>
          </div>

          {/* Ace buttons */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Button
              onClick={() => handleAce(scoreState.serverId, "derecha")}
              variant="secondary"
              className="min-h-[44px]"
              size="sm"
              data-testid="button-ace-derecha"
            >
              <Zap className="h-4 w-4 mr-1" />
              Derecha
            </Button>
            <Button
              onClick={() => handleAce(scoreState.serverId, "izquierda")}
              variant="secondary"
              className="min-h-[44px]"
              size="sm"
              data-testid="button-ace-izquierda"
            >
              <Zap className="h-4 w-4 mr-1" />
              Izquierda
            </Button>
            <Button
              onClick={() => handleDoubleFault(scoreState.serverId)}
              variant="destructive"
              className="min-h-[44px]"
              size="sm"
              data-testid="button-double-fault"
            >
              D.F.
            </Button>
          </div>

          {/* Timeout button */}
          <Button
            onClick={() => handleTimeout(scoreState.serverId)}
            variant="outline"
            className="w-full mb-3 min-h-[44px]"
            disabled={isPlayer1Serving ? getPlayer1TimeoutsUsed() >= 1 : getPlayer2TimeoutsUsed() >= 1}
            data-testid="button-timeout"
          >
            <Clock className="h-4 w-4 mr-2" />
            Tiempo Fuera
            {(isPlayer1Serving ? getPlayer1TimeoutsUsed() : getPlayer2TimeoutsUsed()) >= 1 && " (Usado)"}
          </Button>

          {/* Appellation and Technical */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs text-center font-medium">Apelación</p>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  onClick={() => handleAppellation(scoreState.serverId, "ganada")}
                  variant="outline"
                  size="sm"
                  className="min-h-[40px]"
                  disabled={(isPlayer1Serving ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed()) >= 3}
                  data-testid="button-appellation-won"
                >
                  Ganada
                </Button>
                <Button
                  onClick={() => handleAppellation(scoreState.serverId, "perdida")}
                  variant="outline"
                  size="sm"
                  className="min-h-[40px]"
                  disabled={(isPlayer1Serving ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed()) >= 3}
                  data-testid="button-appellation-lost"
                >
                  Perdida
                </Button>
              </div>
              <Badge variant="outline" className="w-full justify-center">
                {3 - (isPlayer1Serving ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed())} restantes
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-center font-medium">Técnico</p>
              <Button
                onClick={() => handleTechnical(scoreState.serverId)}
                variant="destructive"
                size="sm"
                className="w-full min-h-[40px]"
                data-testid="button-technical"
              >
                {isPlayer1Serving ? session.player1Technicals : session.player2Technicals}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Display */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-500 border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-white text-sm mb-1">{player1.name}</p>
              <p className="text-white text-5xl font-bold">{scoreState.player1Score}</p>
              <p className="text-white text-xs mt-1">Sets: {scoreState.player1Sets}</p>
            </div>
            <div className="text-white text-4xl font-bold">VS</div>
            <div className="text-center">
              <p className="text-white text-sm mb-1">{player2.name}</p>
              <p className="text-white text-5xl font-bold">{scoreState.player2Score}</p>
              <p className="text-white text-xs mt-1">Sets: {scoreState.player2Sets}</p>
            </div>
          </div>
          <p className="text-center text-white text-sm mt-3">Set {scoreState.currentSet}</p>
        </CardContent>
      </Card>

      {/* Receiver Panel */}
      <Card className={!isPlayer1Serving ? "bg-red-50 border-red-500 border-2" : "bg-red-50 border-red-500 border-2"}>
        <CardContent className="p-4">
          <div className="text-center mb-3">
            <h3 className="font-bold text-lg">{!isPlayer1Serving ? player1.name : player2.name}</h3>
            <p className="text-sm text-muted-foreground">Punto jugador recibiendo</p>
          </div>

          {/* Shot type buttons */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <Button
              onClick={() => handlePoint(isPlayer1Serving ? match.player2Id : match.player1Id, "recto")}
              className="bg-red-600 hover:bg-red-700 min-h-[44px]"
              size="sm"
              data-testid="button-receiver-shot-recto"
            >
              Recto
            </Button>
            <Button
              onClick={() => handlePoint(isPlayer1Serving ? match.player2Id : match.player1Id, "esquina")}
              className="bg-red-600 hover:bg-red-700 min-h-[44px]"
              size="sm"
              data-testid="button-receiver-shot-esquina"
            >
              Esquina
            </Button>
            <Button
              onClick={() => handlePoint(isPlayer1Serving ? match.player2Id : match.player1Id, "cruzado")}
              className="bg-red-600 hover:bg-red-700 min-h-[44px]"
              size="sm"
              data-testid="button-receiver-shot-cruzado"
            >
              Cruzado
            </Button>
            <Button
              onClick={() => handlePoint(isPlayer1Serving ? match.player2Id : match.player1Id, "punto")}
              className="bg-red-600 hover:bg-red-700 min-h-[44px]"
              size="sm"
              data-testid="button-receiver-shot-punto"
            >
              Punto
            </Button>
          </div>

          {/* Ace buttons */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Button
              onClick={() => handleAce(isPlayer1Serving ? match.player2Id : match.player1Id, "derecha")}
              variant="secondary"
              className="min-h-[44px]"
              size="sm"
              data-testid="button-receiver-ace-derecha"
            >
              <Zap className="h-4 w-4 mr-1" />
              Derecha
            </Button>
            <Button
              onClick={() => handleAce(isPlayer1Serving ? match.player2Id : match.player1Id, "izquierda")}
              variant="secondary"
              className="min-h-[44px]"
              size="sm"
              data-testid="button-receiver-ace-izquierda"
            >
              <Zap className="h-4 w-4 mr-1" />
              Izquierda
            </Button>
            <Button
              onClick={() => handleDoubleFault(isPlayer1Serving ? match.player2Id : match.player1Id)}
              variant="destructive"
              className="min-h-[44px]"
              size="sm"
              data-testid="button-receiver-double-fault"
            >
              D.F.
            </Button>
          </div>

          {/* Timeout button */}
          <Button
            onClick={() => handleTimeout(isPlayer1Serving ? match.player2Id : match.player1Id)}
            variant="outline"
            className="w-full mb-3 min-h-[44px]"
            disabled={!isPlayer1Serving ? getPlayer1TimeoutsUsed() >= 1 : getPlayer2TimeoutsUsed() >= 1}
            data-testid="button-receiver-timeout"
          >
            <Clock className="h-4 w-4 mr-2" />
            Tiempo Fuera
            {(!isPlayer1Serving ? getPlayer1TimeoutsUsed() : getPlayer2TimeoutsUsed()) >= 1 && " (Usado)"}
          </Button>

          {/* Appellation and Technical */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs text-center font-medium">Apelación</p>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  onClick={() => handleAppellation(isPlayer1Serving ? match.player2Id : match.player1Id, "ganada")}
                  variant="outline"
                  size="sm"
                  className="min-h-[40px]"
                  disabled={(!isPlayer1Serving ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed()) >= 3}
                  data-testid="button-receiver-appellation-won"
                >
                  Ganada
                </Button>
                <Button
                  onClick={() => handleAppellation(isPlayer1Serving ? match.player2Id : match.player1Id, "perdida")}
                  variant="outline"
                  size="sm"
                  className="min-h-[40px]"
                  disabled={(!isPlayer1Serving ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed()) >= 3}
                  data-testid="button-receiver-appellation-lost"
                >
                  Perdida
                </Button>
              </div>
              <Badge variant="outline" className="w-full justify-center">
                {3 - (!isPlayer1Serving ? getPlayer1AppellationsUsed() : getPlayer2AppellationsUsed())} restantes
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-center font-medium">Técnico</p>
              <Button
                onClick={() => handleTechnical(isPlayer1Serving ? match.player2Id : match.player1Id)}
                variant="destructive"
                size="sm"
                className="w-full min-h-[40px]"
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
