import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, MapPin, Clock, Save } from "lucide-react";
import type { Match, Tournament, User } from "@shared/schema";

interface MatchResult {
  winnerId: string;
  player1Sets: number;
  player2Sets: number;
  player1Games: string;
  player2Games: string;
  duration?: number;
}

export function MatchResultsView() {
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, MatchResult>>({});

  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"]
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  // Get matches from active tournaments
  const activeTournaments = tournaments.filter(t => t.status === 'active');
  
  const { data: allMatches = [], isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ["/api/tournaments", activeTournaments[0]?.id, "matches"],
    enabled: activeTournaments.length > 0
  });

  const recordResultMutation = useMutation({
    mutationFn: async ({ matchId, result }: { matchId: string; result: MatchResult }) => {
      const res = await apiRequest("PUT", `/api/matches/${matchId}/result`, result);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Resultado registrado",
        description: "El resultado del partido ha sido registrado exitosamente."
      });
      setSelectedMatch(null);
      setResults({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getUserById = (id: string) => {
    return users.find(u => u.id === id);
  };

  const getMatchesToRecord = () => {
    return allMatches.filter(match => 
      match.status === 'scheduled' || match.status === 'in_progress'
    );
  };

  const handleResultChange = (matchId: string, field: keyof MatchResult, value: string | number) => {
    setResults(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
  };

  const handleSubmitResult = (matchId: string) => {
    const result = results[matchId];
    if (!result) return;

    // Determine winner based on sets
    const winnerId = result.player1Sets > result.player2Sets ? 
      allMatches.find(m => m.id === matchId)?.player1Id :
      allMatches.find(m => m.id === matchId)?.player2Id;

    if (!winnerId) return;

    recordResultMutation.mutate({
      matchId,
      result: {
        ...result,
        winnerId,
        player1Games: JSON.stringify([result.player1Sets]),
        player2Games: JSON.stringify([result.player2Sets])
      }
    });
  };

  const initializeResult = (matchId: string) => {
    if (!results[matchId]) {
      setResults(prev => ({
        ...prev,
        [matchId]: {
          winnerId: '',
          player1Sets: 0,
          player2Sets: 0,
          player1Games: '',
          player2Games: '',
          duration: 90
        }
      }));
    }
    setSelectedMatch(matchId);
  };

  if (tournamentsLoading || usersLoading || matchesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const scheduledMatches = getMatchesToRecord();

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">Registro de Resultados</h3>
        <p className="text-muted-foreground">Registra los resultados oficiales de los partidos</p>
      </div>

      {scheduledMatches.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No hay partidos programados para registrar resultados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {scheduledMatches.map((match) => {
            const player1 = getUserById(match.player1Id);
            const player2 = getUserById(match.player2Id);
            const tournament = tournaments.find(t => t.id === match.tournamentId);
            const isEditing = selectedMatch === match.id;
            const result = results[match.id];

            if (!player1 || !player2 || !tournament) return null;

            return (
              <Card key={match.id} data-testid={`match-card-${match.id}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-card-foreground">
                        {match.round ? `${match.round}` : "Partido"}
                      </h4>
                      <p className="text-sm text-muted-foreground">{tournament.name}</p>
                    </div>
                    <Badge variant={match.status === 'in_progress' ? 'default' : 'secondary'}>
                      {match.status === 'in_progress' ? 'En Curso' : 'Programado'}
                    </Badge>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 mb-6">
                      {/* Player 1 Result Input */}
                      <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground text-sm font-medium">
                              {player1.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-card-foreground">{player1.name}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max="7"
                            className="w-16 h-8 text-center"
                            placeholder="0"
                            value={result?.player1Sets || ''}
                            onChange={(e) => handleResultChange(match.id, 'player1Sets', parseInt(e.target.value) || 0)}
                            data-testid={`player1-sets-${match.id}`}
                          />
                        </div>
                      </div>

                      {/* Player 2 Result Input */}
                      <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground text-sm font-medium">
                              {player2.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-card-foreground">{player2.name}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max="7"
                            className="w-16 h-8 text-center"
                            placeholder="0"
                            value={result?.player2Sets || ''}
                            onChange={(e) => handleResultChange(match.id, 'player2Sets', parseInt(e.target.value) || 0)}
                            data-testid={`player2-sets-${match.id}`}
                          />
                        </div>
                      </div>

                      {/* Duration Input */}
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`duration-${match.id}`} className="text-sm text-muted-foreground">
                          Duración (minutos):
                        </Label>
                        <Input
                          id={`duration-${match.id}`}
                          type="number"
                          min="1"
                          className="w-20 h-8 text-center"
                          value={result?.duration || ''}
                          onChange={(e) => handleResultChange(match.id, 'duration', parseInt(e.target.value) || 90)}
                          data-testid={`duration-${match.id}`}
                        />
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setSelectedMatch(null)}
                          data-testid={`button-cancel-${match.id}`}
                        >
                          Cancelar
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => handleSubmitResult(match.id)}
                          disabled={!result || result.player1Sets === result.player2Sets || recordResultMutation.isPending}
                          data-testid={`button-save-result-${match.id}`}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Players Display */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-primary-foreground text-sm font-medium">
                                {player1.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-card-foreground" data-testid={`player1-name-${match.id}`}>
                              {player1.name}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-center text-muted-foreground text-sm">vs</div>
                        
                        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                              <span className="text-primary-foreground text-sm font-medium">
                                {player2.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-card-foreground" data-testid={`player2-name-${match.id}`}>
                              {player2.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Match Details */}
                      <div className="space-y-3 mb-6 text-sm text-muted-foreground">
                        {match.scheduledAt && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span data-testid={`match-date-${match.id}`}>
                              {new Date(match.scheduledAt).toLocaleDateString('es-ES')} - {new Date(match.scheduledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        {match.courtId && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span>Cancha asignada</span>
                          </div>
                        )}
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => initializeResult(match.id)}
                        data-testid={`button-record-result-${match.id}`}
                      >
                        Registrar Resultado
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
