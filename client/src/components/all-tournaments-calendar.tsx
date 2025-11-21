import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, MapPin, Trophy, Edit } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import type { ScheduledMatch, Court, Tournament, Match, User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export function AllTournamentsCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [resultWinnerId, setResultWinnerId] = useState("");
  const [resultPlayer1Sets, setResultPlayer1Sets] = useState("0");
  const [resultPlayer2Sets, setResultPlayer2Sets] = useState("0");

  // Fetch all scheduled matches for the selected date
  const { data: scheduledMatches = [], isLoading: matchesLoading } = useQuery<ScheduledMatch[]>({
    queryKey: ["/api/scheduled-matches", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await fetch(
        `/api/scheduled-matches?date=${format(selectedDate, "yyyy-MM-dd")}`,
        { credentials: "include" }
      );
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch courts for display
  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"]
  });

  // Fetch tournaments for display
  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"]
  });

  // Fetch all tournament matches (from all tournaments)
  const { data: allTournamentMatches = [] } = useQuery<Match[]>({
    queryKey: ["/api/tournaments/all/matches"],
    queryFn: async () => {
      const allMatches: Match[] = [];
      for (const tournament of tournaments) {
        const response = await fetch(`/api/tournaments/${tournament.id}/matches`, {
          credentials: "include"
        });
        if (response.ok) {
          const matches = await response.json();
          allMatches.push(...matches);
        }
      }
      return allMatches;
    },
    enabled: tournaments.length > 0
  });

  // Fetch all users for player name mapping
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Mutation to save match result
  const saveResultMutation = useMutation({
    mutationFn: async (data: { matchId: string; winnerId: string; player1Sets: number; player2Sets: number }) => {
      const response = await fetch(`/api/matches/${data.matchId}/result`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          winnerId: data.winnerId,
          player1Sets: data.player1Sets,
          player2Sets: data.player2Sets,
          player1Games: "0,0",
          player2Games: "0,0"
        })
      });
      if (!response.ok) throw new Error("Failed to save result");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Resultado guardado correctamente" });
      setEditingMatch(null);
      // Refetch matches
      window.location.reload();
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo guardar el resultado", variant: "destructive" });
    }
  });

  const getCourtName = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    return court?.name || "Cancha desconocida";
  };

  const getTournamentName = (tournamentId: string | null) => {
    if (!tournamentId) return "Sin torneo";
    const tournament = tournaments.find(t => t.id === tournamentId);
    return tournament?.name || "Torneo desconocido";
  };

  const getTournament = (tournamentId: string | null) => {
    if (!tournamentId) return null;
    return tournaments.find(t => t.id === tournamentId) || null;
  };

  const getPlayerName = (playerId: string | undefined, fallbackName: string | undefined, index: number) => {
    if (fallbackName) return fallbackName;
    if (playerId) {
      const player = users.find(u => u.id === playerId);
      return player?.name || `Jugador ${index}`;
    }
    return `Jugador ${index}`;
  };

  const getPlayerDisplay = (match: ScheduledMatch | any) => {
    if (match.matchType === "doubles") {
      const p1 = getPlayerName(match.player1Id, match.player1Name, 1);
      const p2 = getPlayerName(match.player2Id, match.player2Name, 2);
      const p3 = getPlayerName(match.player3Id, match.player3Name, 3);
      const p4 = getPlayerName(match.player4Id, match.player4Name, 4);
      return `${p1} & ${p3} vs ${p2} & ${p4}`;
    }
    const p1 = getPlayerName(match.player1Id, match.player1Name, 1);
    const p2 = getPlayerName(match.player2Id, match.player2Name, 2);
    return `${p1} vs ${p2}`;
  };

  // Combine scheduled matches and tournament matches
  const combinedMatches = useMemo(() => {
    const selected = format(selectedDate, "yyyy-MM-dd");
    const scheduledOnly = [...scheduledMatches];
    
    // Add tournament matches that match the selected date
    const tournamentMatchesForDate = allTournamentMatches
      .filter(match => {
        if (!match.scheduledAt) return false;
        const utcDate = new Date(match.scheduledAt);
        const timezone = tournaments.find(t => t.id === match.tournamentId)?.timezone || "America/Mexico_City";
        const zonedDate = toZonedTime(utcDate, timezone);
        return format(zonedDate, "yyyy-MM-dd") === selected;
      })
      .map(match => ({
        id: match.id,
        title: `${match.round || "Partido"} (Bracket)`,
        scheduledDate: match.scheduledAt || new Date().toISOString(),
        sport: "racquetball" as const,
        matchType: match.matchType as "singles" | "doubles",
        courtId: match.courtId || "",
        duration: 90,
        tournamentId: match.tournamentId,
        category: match.category,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
        player3Id: match.player3Id,
        player4Id: match.player4Id,
        player1Name: match.player1Name || "",
        player2Name: match.player2Name || "",
        player3Name: match.player3Name || "",
        player4Name: match.player4Name || "",
        notes: ""
      })) as any;

    return [...scheduledOnly, ...tournamentMatchesForDate];
  }, [scheduledMatches, allTournamentMatches, selectedDate, tournaments]);

  // Group matches by tournament
  const matchesByTournament = combinedMatches.reduce((acc, match) => {
    const tournamentId = match.tournamentId || "no-tournament";
    if (!acc[tournamentId]) {
      acc[tournamentId] = [];
    }
    acc[tournamentId].push(match);
    return acc;
  }, {} as Record<string, ScheduledMatch[]>);

  // Sort matches within each tournament by time
  Object.keys(matchesByTournament).forEach(tournamentId => {
    matchesByTournament[tournamentId].sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  });

  if (matchesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          data-testid="button-prev-day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg font-semibold">
            {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          data-testid="button-next-day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Matches list */}
      {combinedMatches.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">
              No hay partidos programados para este día
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(matchesByTournament).map(([tournamentId, matches]) => (
            <Card key={tournamentId}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {getTournamentName(tournamentId === "no-tournament" ? null : tournamentId)}
                  <Badge variant="secondary" className="ml-2">
                    {matches.length} {matches.length === 1 ? "partido" : "partidos"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`match-${match.id}`}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-base">{match.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Users className="h-4 w-4" />
                              <span>{getPlayerDisplay(match)}</span>
                              <Badge variant="outline" className="ml-2">
                                {match.matchType === "singles" ? "Singles" : "Dobles"}
                              </Badge>
                              {match.category && (
                                <Badge variant="secondary" className="ml-1">
                                  {match.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={
                              match.status === "completado" ? "default" :
                              match.status === "en_curso" ? "secondary" :
                              match.status === "confirmado" ? "outline" : "secondary"
                            }
                          >
                            {match.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {(() => {
                                const tournament = getTournament(match.tournamentId);
                                const timezone = tournament?.timezone || "America/Mexico_City";
                                const utcDate = new Date(match.scheduledDate);
                                const zonedDate = toZonedTime(utcDate, timezone);
                                return format(zonedDate, "HH:mm");
                              })()}
                            </span>
                            <span>({match.duration} min)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{getCourtName(match.courtId)}</span>
                          </div>
                        </div>

                        {match.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            {match.notes}
                          </p>
                        )}

                        {/* Action buttons for admin */}
                        {(user?.role === "superadmin" || user?.role === "admin") && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            {match.status !== "completado" && (
                              <Link href={`/stats/capture/${match.id}`}>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="w-full"
                                  data-testid={`button-capture-stats-${match.id}`}
                                >
                                  <Trophy className="h-4 w-4 mr-2" />
                                  Capturar estadísticas
                                </Button>
                              </Link>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setEditingMatch(match);
                                setResultWinnerId(match.winnerId || match.player1Id || "");
                                setResultPlayer1Sets(match.player1Sets?.toString() || "0");
                                setResultPlayer2Sets(match.player2Sets?.toString() || "0");
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar resultado
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Result Dialog */}
      <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar resultado del partido</DialogTitle>
          </DialogHeader>
          {editingMatch && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">{getPlayerDisplay(editingMatch)}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Ganador</Label>
                <Select value={resultWinnerId} onValueChange={setResultWinnerId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editingMatch.matchType === "singles" ? (
                      <>
                        <SelectItem value={editingMatch.player1Id || ""}>
                          {getPlayerName(editingMatch.player1Id, editingMatch.player1Name, 1)}
                        </SelectItem>
                        <SelectItem value={editingMatch.player2Id || ""}>
                          {getPlayerName(editingMatch.player2Id, editingMatch.player2Name, 2)}
                        </SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value={`${editingMatch.player1Id}-${editingMatch.player3Id}`}>
                          {getPlayerName(editingMatch.player1Id, editingMatch.player1Name, 1)} & {getPlayerName(editingMatch.player3Id, editingMatch.player3Name, 3)}
                        </SelectItem>
                        <SelectItem value={`${editingMatch.player2Id}-${editingMatch.player4Id}`}>
                          {getPlayerName(editingMatch.player2Id, editingMatch.player2Name, 2)} & {getPlayerName(editingMatch.player4Id, editingMatch.player4Name, 4)}
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sets {editingMatch.matchType === "singles" ? "Jugador 1" : "Equipo 1"}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={resultPlayer1Sets}
                    onChange={(e) => setResultPlayer1Sets(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sets {editingMatch.matchType === "singles" ? "Jugador 2" : "Equipo 2"}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={resultPlayer2Sets}
                    onChange={(e) => setResultPlayer2Sets(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMatch(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!resultWinnerId) {
                  toast({ title: "Error", description: "Selecciona el ganador", variant: "destructive" });
                  return;
                }
                saveResultMutation.mutate({
                  matchId: editingMatch.id,
                  winnerId: resultWinnerId,
                  player1Sets: parseInt(resultPlayer1Sets) || 0,
                  player2Sets: parseInt(resultPlayer2Sets) || 0
                });
              }}
              disabled={saveResultMutation.isPending}
            >
              {saveResultMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
