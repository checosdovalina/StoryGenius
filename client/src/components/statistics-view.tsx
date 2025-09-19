import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Clock, Flame } from "lucide-react";
import type { PlayerStats, Match } from "@shared/schema";

export function StatisticsView() {
  const { user } = useAuth();

  const { data: playerStats = [], isLoading: statsLoading } = useQuery<PlayerStats[]>({
    queryKey: ["/api/players", user?.id, "stats"],
    enabled: !!user?.id
  });

  const { data: playerMatches = [], isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ["/api/players", user?.id, "matches"],
    enabled: !!user?.id
  });

  // Get global stats (non-tournament specific)
  const globalStats = playerStats.find(stat => !stat.tournamentId) || {
    matchesWon: 0,
    matchesLost: 0,
    avgMatchDuration: 0,
    currentWinStreak: 0
  };

  const recentMatches = playerMatches
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  if (statsLoading || matchesLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 mx-auto mb-4" />
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-16" />
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
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">Estadísticas del Jugador</h3>
        <p className="text-muted-foreground">Resumen de tu rendimiento deportivo</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="stat-wins">
          <CardContent className="p-6">
            <div className="text-center">
              <Trophy className="h-12 w-12 text-accent mx-auto mb-4" />
              <h4 className="text-2xl font-bold text-card-foreground" data-testid="wins-count">
                {globalStats.matchesWon}
              </h4>
              <p className="text-muted-foreground">Partidos Ganados</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-duration">
          <CardContent className="p-6">
            <div className="text-center">
              <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="text-2xl font-bold text-card-foreground" data-testid="avg-duration">
                {globalStats.avgMatchDuration ? formatDuration(globalStats.avgMatchDuration) : "0h 0m"}
              </h4>
              <p className="text-muted-foreground">Duración Promedio</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-streak">
          <CardContent className="p-6">
            <div className="text-center">
              <Flame className="h-12 w-12 text-warning mx-auto mb-4" />
              <h4 className="text-2xl font-bold text-card-foreground" data-testid="win-streak">
                {globalStats.currentWinStreak}
              </h4>
              <p className="text-muted-foreground">Racha de Victorias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match History and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="match-history">
          <CardHeader>
            <CardTitle>Historial de Partidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMatches.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay partidos registrados
                </p>
              ) : (
                recentMatches.map((match, index) => {
                  const isWinner = match.winnerId === user?.id;
                  const opponent = match.player1Id === user?.id ? "Oponente" : "Oponente";
                  
                  return (
                    <div key={match.id} className="flex items-center justify-between p-3 bg-muted rounded-md" data-testid={`match-${index}`}>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">vs {opponent}</p>
                        <p className="text-xs text-muted-foreground">
                          {match.scheduledAt ? new Date(match.scheduledAt).toLocaleDateString('es-ES') : 'Fecha no definida'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isWinner ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
                        }`}>
                          {isWinner ? 'Victoria' : 'Derrota'}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          {match.player1Sets}-{match.player2Sets}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="performance-breakdown">
          <CardHeader>
            <CardTitle>Rendimiento General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between" data-testid="win-percentage">
                <span className="text-sm text-muted-foreground">Porcentaje de Victoria</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div 
                      className="bg-accent h-2 rounded-full" 
                      style={{ 
                        width: `${globalStats.matchesWon + globalStats.matchesLost > 0 
                          ? (globalStats.matchesWon / (globalStats.matchesWon + globalStats.matchesLost)) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-card-foreground">
                    {globalStats.matchesWon + globalStats.matchesLost > 0 
                      ? Math.round((globalStats.matchesWon / (globalStats.matchesWon + globalStats.matchesLost)) * 100)
                      : 0}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between" data-testid="total-matches">
                <span className="text-sm text-muted-foreground">Total Partidos</span>
                <span className="text-sm font-medium text-card-foreground">
                  {globalStats.matchesWon + globalStats.matchesLost}
                </span>
              </div>

              <div className="flex items-center justify-between" data-testid="best-streak">
                <span className="text-sm text-muted-foreground">Mejor Racha</span>
                <span className="text-sm font-medium text-card-foreground">
                  {globalStats.currentWinStreak} victorias
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
