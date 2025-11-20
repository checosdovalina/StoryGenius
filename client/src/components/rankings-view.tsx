import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, Loader2 } from "lucide-react";
import type { Tournament } from "@shared/schema";

interface RankingPlayer {
  playerId: string;
  playerName: string;
  playerEmail?: string;
  rankingPoints?: number | null;
  matchesPlayed: number | null;
  matchesWon: number | null;
  matchesLost: number | null;
  setsWon?: number | null;
  setsLost?: number | null;
  totalPoints?: number;
  acesCount?: number;
}

export function RankingsView() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | undefined>();

  const { data: irtRanking, isLoading: isLoadingIRT } = useQuery<RankingPlayer[]>({
    queryKey: ["/api/ranking/global"],
  });

  const { data: tournaments } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
  });

  const { data: tournamentRanking, isLoading: isLoadingTournament } = useQuery<RankingPlayer[]>({
    queryKey: [`/api/tournaments/${selectedTournamentId}/rankings`],
    enabled: !!selectedTournamentId,
  });

  const getRankIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getRankBadge = (position: number) => {
    if (position === 1) return <Badge className="bg-yellow-500">1°</Badge>;
    if (position === 2) return <Badge className="bg-gray-400">2°</Badge>;
    if (position === 3) return <Badge className="bg-amber-600">3°</Badge>;
    if (position <= 10) return <Badge variant="secondary">Top 10</Badge>;
    return null;
  };

  const getWinRate = (won: number | null, played: number | null) => {
    if (!played || played === 0 || !won) return "0%";
    return `${Math.round((won / played) * 100)}%`;
  };

  const renderIRTRankingTable = () => {
    if (isLoadingIRT) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!irtRanking || irtRanking.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No hay datos de ranking disponibles
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Posición</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead className="text-right">Puntos IRT</TableHead>
              <TableHead className="text-right">Partidos</TableHead>
              <TableHead className="text-right">Ganados</TableHead>
              <TableHead className="text-right">Perdidos</TableHead>
              <TableHead className="text-right">% Victorias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {irtRanking.map((player, index) => {
              const position = index + 1;
              return (
                <TableRow 
                  key={player.playerId}
                  className={position <= 3 ? "bg-muted/50" : ""}
                  data-testid={`ranking-row-${player.playerId}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRankIcon(position)}
                      <span className="font-semibold">{position}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" data-testid={`player-name-${player.playerId}`}>
                          {player.playerName}
                        </span>
                        {getRankBadge(position)}
                      </div>
                      {player.playerEmail && (
                        <span className="text-xs text-muted-foreground">
                          {player.playerEmail}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="font-bold" data-testid={`points-${player.playerId}`}>
                      {player.rankingPoints || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" data-testid={`matches-played-${player.playerId}`}>
                    {player.matchesPlayed || 0}
                  </TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400" data-testid={`matches-won-${player.playerId}`}>
                    {player.matchesWon || 0}
                  </TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400" data-testid={`matches-lost-${player.playerId}`}>
                    {player.matchesLost || 0}
                  </TableCell>
                  <TableCell className="text-right font-medium" data-testid={`win-rate-${player.playerId}`}>
                    {getWinRate(player.matchesWon, player.matchesPlayed)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderTournamentRankingTable = () => {
    if (!selectedTournamentId) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          Selecciona un torneo para ver el ranking
        </div>
      );
    }

    if (isLoadingTournament) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!tournamentRanking || tournamentRanking.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No hay datos de ranking para este torneo
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Posición</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead className="text-right">Partidos</TableHead>
              <TableHead className="text-right">Ganados</TableHead>
              <TableHead className="text-right">Perdidos</TableHead>
              <TableHead className="text-right">Sets +/-</TableHead>
              <TableHead className="text-right">% Victorias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tournamentRanking.map((player, index) => {
              const position = index + 1;
              const setsDiff = (player.setsWon || 0) - (player.setsLost || 0);
              return (
                <TableRow 
                  key={player.playerId}
                  className={position <= 3 ? "bg-muted/50" : ""}
                  data-testid={`tournament-ranking-row-${player.playerId}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRankIcon(position)}
                      <span className="font-semibold">{position}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" data-testid={`tournament-player-name-${player.playerId}`}>
                          {player.playerName}
                        </span>
                        {getRankBadge(position)}
                      </div>
                      {player.playerEmail && (
                        <span className="text-xs text-muted-foreground">
                          {player.playerEmail}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right" data-testid={`tournament-matches-played-${player.playerId}`}>
                    {player.matchesPlayed || 0}
                  </TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400" data-testid={`tournament-matches-won-${player.playerId}`}>
                    {player.matchesWon || 0}
                  </TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400" data-testid={`tournament-matches-lost-${player.playerId}`}>
                    {player.matchesLost || 0}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${setsDiff > 0 ? 'text-green-600 dark:text-green-400' : setsDiff < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {setsDiff > 0 && '+'}{setsDiff}
                  </TableCell>
                  <TableCell className="text-right font-medium" data-testid={`tournament-win-rate-${player.playerId}`}>
                    {getWinRate(player.matchesWon, player.matchesPlayed)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const selectedTournament = tournaments?.find(t => t.id === selectedTournamentId);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rankings</h1>
          <p className="text-muted-foreground mt-1">
            Clasificaciones y posiciones
          </p>
        </div>
      </div>

      <Tabs defaultValue="irt" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="irt" data-testid="tab-irt-ranking">Ranking IRT</TabsTrigger>
          <TabsTrigger value="tournament" data-testid="tab-tournament-ranking">Por Torneo</TabsTrigger>
        </TabsList>

        <TabsContent value="irt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>IRT World Ranking</CardTitle>
              <CardDescription>
                Top 100 jugadores por puntos IRT acumulados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderIRTRankingTable()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información del Sistema IRT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Tiers de Torneos</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Grand Slam (GS):</strong> 1000 y 900 puntos</li>
                  <li>• <strong>Tier 1 (IRT):</strong> 800 y 700 puntos</li>
                  <li>• <strong>Satellites (SAT):</strong> 600, 500, 400, 350, 250, 150 puntos</li>
                  <li>• <strong>Doubles Pro (DOB):</strong> 800, 700, 600, 500 puntos</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Sistema de Puntos</h4>
                <p className="text-muted-foreground">
                  Los puntos se otorgan automáticamente al completar partidos en torneos con tier IRT asignado.
                  Los puntos dependen del tier del torneo, la ronda alcanzada, y el resultado del partido.
                  Los puntos no expiran y se acumulan permanentemente.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournament" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ranking por Torneo</CardTitle>
              <CardDescription>
                Clasificación basada en victorias y sets en un torneo específico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium min-w-fit">Seleccionar Torneo:</label>
                <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                  <SelectTrigger className="max-w-md" data-testid="tournament-selector">
                    <SelectValue placeholder="Selecciona un torneo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tournaments?.map((tournament) => (
                      <SelectItem key={tournament.id} value={tournament.id} data-testid={`tournament-option-${tournament.id}`}>
                        {tournament.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTournament && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Ubicación: {selectedTournament.location}</span>
                  {selectedTournament.tier && (
                    <>
                      <span>•</span>
                      <Badge variant="outline">{selectedTournament.tier}</Badge>
                    </>
                  )}
                </div>
              )}

              {renderTournamentRankingTable()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
