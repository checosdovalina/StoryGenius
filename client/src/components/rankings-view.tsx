import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Medal, Trophy, Award } from "lucide-react";
import type { Tournament } from "@shared/schema";

interface RankingEntry {
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerClub: string;
  rankingScore: number;
  matchesWon: number;
  matchesLost: number;
  totalMatches: number;
  winRate: number;
  avgMatchDuration: number;
  totalPoints: number;
  aces: number;
  doubleFaults: number;
  aceEffectiveness: number;
  winners: number;
  errors: number;
  rankingPoints: number;
  currentWinStreak: number;
}

export function RankingsView() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  const { data: globalRankings = [], isLoading: globalLoading } = useQuery<RankingEntry[]>({
    queryKey: ["/api/rankings/global"]
  });

  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"]
  });

  const { data: tournamentRankings = [], isLoading: tournamentRankingsLoading } = useQuery<RankingEntry[]>({
    queryKey: selectedTournamentId ? [`/api/tournaments/${selectedTournamentId}/rankings`] : [],
    enabled: !!selectedTournamentId
  });

  const activeTournaments = tournaments.filter(t => t.status === 'active');
  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Medal className="h-6 w-6 text-yellow-500" />;
      case 2: return <Medal className="h-6 w-6 text-gray-400" />;
      case 3: return <Medal className="h-6 w-6 text-amber-600" />;
      default: return <div className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">{position}</div>;
    }
  };

  if (globalLoading || tournamentsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">Rankings</h3>
        <p className="text-muted-foreground">Clasificaciones por torneo y ranking global</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Rankings */}
        <Card data-testid="global-rankings">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5 text-primary" />
                Ranking Global
              </CardTitle>
              <Select defaultValue="all">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="padel">Pádel</SelectItem>
                  <SelectItem value="racquetball">Raquetbol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {globalRankings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay datos de ranking disponibles
                </p>
              ) : (
                globalRankings.slice(0, 10).map((stat, index) => {
                  const position = index + 1;
                  
                  return (
                    <div key={stat.playerId} className="flex items-center space-x-4" data-testid={`global-rank-${position}`}>
                      {getRankIcon(position)}
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-sm font-medium">
                          {stat.playerName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-card-foreground" data-testid={`player-name-${position}`}>
                          {stat.playerName}
                        </p>
                        <div className="flex gap-2 items-center text-xs text-muted-foreground">
                          <span>{stat.playerClub}</span>
                          <span>•</span>
                          <span>{stat.matchesWon}V-{stat.matchesLost}D</span>
                          {stat.winRate > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-accent font-medium">{stat.winRate}%</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-card-foreground" data-testid={`ranking-points-${position}`}>
                          {stat.rankingScore}
                        </p>
                        <p className="text-xs text-muted-foreground">puntos</p>
                        <div className="flex gap-1 mt-1 justify-end">
                          {stat.totalPoints > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {stat.totalPoints}pts
                            </Badge>
                          )}
                          {stat.aces > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              {stat.aces}A
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tournament Rankings */}
        <Card data-testid="tournament-rankings">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Award className="mr-2 h-5 w-5 text-accent" />
                Rankings de Torneos
              </CardTitle>
              <Select value={selectedTournamentId || undefined} onValueChange={setSelectedTournamentId}>
                <SelectTrigger className="w-48" data-testid="tournament-select">
                  <SelectValue placeholder="Seleccionar torneo" />
                </SelectTrigger>
                <SelectContent>
                  {activeTournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTournaments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay torneos activos
                </p>
              ) : !selectedTournamentId ? (
                <p className="text-muted-foreground text-center py-8">
                  Selecciona un torneo para ver el ranking
                </p>
              ) : tournamentRankingsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : tournamentRankings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay datos de ranking disponibles para este torneo
                </p>
              ) : (
                tournamentRankings.slice(0, 10).map((stat, index) => {
                  const position = index + 1;
                  
                  return (
                    <div key={stat.playerId} className="flex items-center space-x-4" data-testid={`tournament-rank-${position}`}>
                      {getRankIcon(position)}
                      <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                        <span className="text-accent-foreground text-sm font-medium">
                          {stat.playerName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-card-foreground">
                          {stat.playerName}
                        </p>
                        <div className="flex gap-2 items-center text-xs text-muted-foreground">
                          <span>{stat.playerClub}</span>
                          <span>•</span>
                          <span>{stat.matchesWon}V-{stat.matchesLost}D</span>
                          {stat.winRate > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-accent font-medium">{stat.winRate}%</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-card-foreground">
                          {stat.rankingScore}
                        </p>
                        <p className="text-xs text-muted-foreground">puntos</p>
                        <div className="flex gap-1 mt-1 justify-end">
                          {stat.totalPoints > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {stat.totalPoints}pts
                            </Badge>
                          )}
                          {stat.aces > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              {stat.aces}A
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
