import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [resultWinnerId, setResultWinnerId] = useState("");
  
  // Set-based structure
  const [set1Player1, setSet1Player1] = useState("0");
  const [set1Player2, setSet1Player2] = useState("0");
  const [set2Player1, setSet2Player1] = useState("0");
  const [set2Player2, setSet2Player2] = useState("0");
  const [set3Player1, setSet3Player1] = useState("0");
  const [set3Player2, setSet3Player2] = useState("0");

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

  // Calculate sets won
  const calculateSetsWon = () => {
    let player1Sets = 0;
    let player2Sets = 0;
    
    if (parseInt(set1Player1) > parseInt(set1Player2)) player1Sets++;
    else if (parseInt(set1Player2) > parseInt(set1Player1)) player2Sets++;
    
    if (parseInt(set2Player1) > parseInt(set2Player2)) player1Sets++;
    else if (parseInt(set2Player2) > parseInt(set2Player1)) player2Sets++;
    
    if (parseInt(set3Player1) > parseInt(set3Player2)) player1Sets++;
    else if (parseInt(set3Player2) > parseInt(set3Player1)) player2Sets++;
    
    return { player1Sets, player2Sets };
  };

  const { player1Sets, player2Sets } = calculateSetsWon();
  const isSet3Disabled = player1Sets === 2 || player2Sets === 2;

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
          player1Games: JSON.stringify([set1Player1, set2Player1, set3Player1]),
          player2Games: JSON.stringify([set1Player2, set2Player2, set3Player2]),
          status: "completed"
        })
      });
      if (!response.ok) throw new Error("Failed to save result");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Partido finalizado correctamente" });
      setEditingMatch(null);
      // Invalidate all relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments/all/matches"] });
      // Also invalidate specific tournament matches
      for (const tournament of Object.values({}) as any[]) {
        queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo finalizar el partido", variant: "destructive" });
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
        player1Name: match.player1Name,
        player2Name: match.player2Name,
        player3Name: match.player3Name,
        player4Name: match.player4Name,
        organizerId: match.organizerId,
        status: match.status,
        winnerId: match.winnerId,
        player1Sets: match.player1Sets,
        player2Sets: match.player2Sets
      }));
    
    return [...scheduledOnly, ...tournamentMatchesForDate];
  }, [scheduledMatches, allTournamentMatches, selectedDate, tournaments]);

  // Group matches by tournament
  const matchesByTournament = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    combinedMatches.forEach(match => {
      const tournamentName = getTournamentName(match.tournamentId);
      if (!grouped[tournamentName]) {
        grouped[tournamentName] = [];
      }
      grouped[tournamentName].push(match);
    });
    return grouped;
  }, [combinedMatches]);

  const handleOpenEditDialog = (match: any) => {
    setEditingMatch(match);
    setResultWinnerId(match.winnerId || match.player1Id || "");
    
    // Parse existing game scores if available
    try {
      if (match.player1Games && match.player2Games) {
        const p1Games = JSON.parse(match.player1Games);
        const p2Games = JSON.parse(match.player2Games);
        setSet1Player1(p1Games[0]?.toString() || "0");
        setSet1Player2(p2Games[0]?.toString() || "0");
        setSet2Player1(p1Games[1]?.toString() || "0");
        setSet2Player2(p2Games[1]?.toString() || "0");
        setSet3Player1(p1Games[2]?.toString() || "0");
        setSet3Player2(p2Games[2]?.toString() || "0");
      } else {
        setSet1Player1("0");
        setSet1Player2("0");
        setSet2Player1("0");
        setSet2Player2("0");
        setSet3Player1("0");
        setSet3Player2("0");
      }
    } catch {
      setSet1Player1("0");
      setSet1Player2("0");
      setSet2Player1("0");
      setSet2Player2("0");
      setSet3Player1("0");
      setSet3Player2("0");
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">📅 Todos los Torneos</h2>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Matches by Tournament */}
      {matchesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : Object.keys(matchesByTournament).length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No hay partidos para esta fecha</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(matchesByTournament).map(([tournamentName, matches]) => (
            <Card key={tournamentName}>
              <CardHeader>
                <CardTitle className="text-lg">{tournamentName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="p-3 border rounded-lg hover:bg-accent/50 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{getPlayerDisplay(match)}</span>
                            {match.category && (
                              <Badge variant="outline" className="text-xs">
                                {match.category}
                              </Badge>
                            )}
                            {match.status === "completado" && (
                              <Badge className="bg-green-600 text-xs">Completado</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {match.courtId && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {getCourtName(match.courtId)}
                              </div>
                            )}
                            {match.scheduledDate && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(match.scheduledDate), "HH:mm")}
                              </div>
                            )}
                          </div>

                          <div className="text-sm">
                            <span className="text-muted-foreground">Sets: </span>
                            <span className="font-semibold">{match.player1Sets || 0} - {match.player2Sets || 0}</span>
                          </div>
                        </div>

                        {(user?.role === "superadmin" || user?.role === "admin") && (
                          <div className="mt-3 pt-3 border-t space-y-2 w-full">
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
                              onClick={() => handleOpenEditDialog(match)}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar resultado del partido</DialogTitle>
          </DialogHeader>
          {editingMatch && (
            <div className="grid grid-cols-2 gap-6">
              {/* Formulario de edición */}
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

                {/* Sets editor */}
                <div className="space-y-4">
                  <div>
                    <Label className="font-bold mb-3 block">Set 1</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          type="number"
                          min="0"
                          value={set1Player1}
                          onChange={(e) => setSet1Player1(e.target.value)}
                          placeholder={getPlayerName(editingMatch.player1Id, editingMatch.player1Name, 1)}
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          value={set1Player2}
                          onChange={(e) => setSet1Player2(e.target.value)}
                          placeholder={getPlayerName(editingMatch.player2Id, editingMatch.player2Name, 2)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="font-bold mb-3 block">Set 2</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          type="number"
                          min="0"
                          value={set2Player1}
                          onChange={(e) => setSet2Player1(e.target.value)}
                          placeholder={getPlayerName(editingMatch.player1Id, editingMatch.player1Name, 1)}
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          value={set2Player2}
                          onChange={(e) => setSet2Player2(e.target.value)}
                          placeholder={getPlayerName(editingMatch.player2Id, editingMatch.player2Name, 2)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className={`font-bold mb-3 block ${isSet3Disabled ? "opacity-50" : ""}`}>
                      Set 3 {isSet3Disabled && "(Deshabilitado)"}
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          type="number"
                          min="0"
                          value={set3Player1}
                          onChange={(e) => setSet3Player1(e.target.value)}
                          placeholder={getPlayerName(editingMatch.player1Id, editingMatch.player1Name, 1)}
                          disabled={isSet3Disabled}
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          value={set3Player2}
                          onChange={(e) => setSet3Player2(e.target.value)}
                          placeholder={getPlayerName(editingMatch.player2Id, editingMatch.player2Name, 2)}
                          disabled={isSet3Disabled}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="font-semibold mb-1">Sets ganados:</p>
                    <p>Equipo 1: <span className="font-bold">{player1Sets}</span> | Equipo 2: <span className="font-bold">{player2Sets}</span></p>
                  </div>
                </div>
              </div>

              {/* Preview del partido terminado */}
              <div className="border-l pl-6 max-h-[500px] overflow-y-auto">
                <p className="text-sm font-semibold mb-3 text-center">Vista previa</p>
                <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-4 rounded-lg text-white space-y-3 text-sm">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-400">🏆 PARTIDO TERMINADO</p>
                    <p className="text-yellow-300 font-semibold">{getTournamentName(editingMatch.tournamentId)}</p>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 rounded-lg text-white text-center">
                    <p className="text-xs font-bold mb-1">GANADOR</p>
                    <p className="font-bold">
                      {resultWinnerId === editingMatch.player1Id 
                        ? getPlayerName(editingMatch.player1Id, editingMatch.player1Name, 1)
                        : getPlayerName(editingMatch.player2Id, editingMatch.player2Name, 2)}
                    </p>
                  </div>

                  <div className="bg-black/60 p-3 rounded-lg space-y-2">
                    <p className="text-xs font-bold text-center">RESULTADO FINAL</p>
                    <p className="text-center text-lg font-bold">
                      <span className="text-yellow-400">{player1Sets}</span> - <span className="text-yellow-400">{player2Sets}</span> Sets
                    </p>
                    <p className="text-center text-xs text-yellow-300">
                      {set1Player1} - {set1Player2} | {set2Player1} - {set2Player2} {!isSet3Disabled && `| ${set3Player1} - ${set3Player2}`}
                    </p>
                  </div>
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
                if ((player1Sets !== 2 && player2Sets !== 2) || (player1Sets === 2 && player2Sets === 2)) {
                  toast({ title: "Error", description: "El resultado debe ser 2-0 o 2-1", variant: "destructive" });
                  return;
                }
                saveResultMutation.mutate({
                  matchId: editingMatch.id,
                  winnerId: resultWinnerId,
                  player1Sets,
                  player2Sets
                });
              }}
              disabled={saveResultMutation.isPending}
            >
              {saveResultMutation.isPending ? "Finalizando..." : "🏁 Terminar Game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
