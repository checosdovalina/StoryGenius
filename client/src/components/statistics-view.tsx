import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Clock, Flame, BarChart3, Calendar, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInMinutes } from "date-fns";
import type { PlayerStats, Match, MatchStatsSession, MatchEvent, User, Tournament } from "@shared/schema";

export function StatisticsView() {
  const { user } = useAuth();
  const isAdminOrEscribano = user && ["admin", "escribano"].includes(user.role);

  const { data: playerStats = [], isLoading: statsLoading } = useQuery<PlayerStats[]>({
    queryKey: ["/api/players", user?.id, "stats"],
    enabled: !!user?.id
  });

  const { data: playerMatches = [], isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ["/api/players", user?.id, "matches"],
    enabled: !!user?.id
  });

  // Fetch all match stats sessions (for admins/escribanos)
  const { data: allSessions = [], isLoading: sessionsLoading } = useQuery<(MatchStatsSession & { match?: Match; tournament?: Tournament; player1?: User; player2?: User })[]>({
    queryKey: ["/api/stats/sessions"],
    enabled: !!isAdminOrEscribano
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

  // Filter completed sessions and sort by most recent
  const completedSessions = (allSessions as (MatchStatsSession & { match?: Match; tournament?: Tournament; player1?: User; player2?: User })[])
    .filter((s: MatchStatsSession) => s.status === "completed" && s.completedAt)
    .sort((a: MatchStatsSession, b: MatchStatsSession) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateSessionDuration = (session: MatchStatsSession) => {
    if (!session.completedAt) return null;
    const duration = differenceInMinutes(new Date(session.completedAt), new Date(session.startedAt));
    return formatDuration(duration);
  };

  if (statsLoading || matchesLoading || (isAdminOrEscribano && sessionsLoading)) {
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
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">Estadísticas</h3>
        <p className="text-muted-foreground">
          {isAdminOrEscribano ? "Resumen de estadísticas del sistema y capturas realizadas" : "Resumen de tu rendimiento deportivo"}
        </p>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal" data-testid="tab-personal">Estadísticas Personales</TabsTrigger>
          {isAdminOrEscribano && (
            <TabsTrigger value="captures" data-testid="tab-captures">Capturas Realizadas</TabsTrigger>
          )}
        </TabsList>

        {/* Personal Stats Tab */}
        <TabsContent value="personal" className="space-y-8">
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
        </TabsContent>

        {/* Captures Tab (Admin/Escribano only) */}
        {isAdminOrEscribano && (
          <TabsContent value="captures" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Sesiones de Captura Completadas
                    </CardTitle>
                    <CardDescription>
                      Registro de todas las sesiones de captura de estadísticas finalizadas
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{completedSessions.length} sesiones</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {completedSessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay sesiones de captura completadas
                  </p>
                ) : (
                  <div className="space-y-4">
                    {completedSessions.map((session: MatchStatsSession & { match?: Match; tournament?: Tournament; player1?: User; player2?: User }) => {
                      const duration = calculateSessionDuration(session);
                      const player1Name = session.player1?.name || "Jugador 1";
                      const player2Name = session.player2?.name || "Jugador 2";
                      
                      return (
                        <Card key={session.id} className="border-l-4 border-l-accent">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Header */}
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">
                                      {player1Name} vs {player2Name}
                                    </span>
                                  </div>
                                  {session.tournament && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Trophy className="h-3 w-3" />
                                      {session.tournament.name}
                                    </div>
                                  )}
                                </div>
                                <Badge variant={session.status === "completed" ? "default" : "secondary"} className="text-xs">
                                  {session.sport.toUpperCase()}
                                </Badge>
                              </div>

                              {/* Score */}
                              <div className="flex items-center gap-4 py-2 border-y">
                                <div className="flex-1 text-center">
                                  <div className="text-2xl font-bold">{session.player1CurrentScore}</div>
                                  <div className="text-xs text-muted-foreground">Sets: {session.player1Sets}</div>
                                </div>
                                <div className="text-muted-foreground">-</div>
                                <div className="flex-1 text-center">
                                  <div className="text-2xl font-bold">{session.player2CurrentScore}</div>
                                  <div className="text-xs text-muted-foreground">Sets: {session.player2Sets}</div>
                                </div>
                              </div>

                              {/* Times */}
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <div>
                                    <div className="font-medium text-foreground">Inicio</div>
                                    <div>{format(new Date(session.startedAt), 'HH:mm - dd/MM/yyyy')}</div>
                                  </div>
                                </div>
                                {session.completedAt && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <div>
                                      <div className="font-medium text-foreground">Fin</div>
                                      <div>{format(new Date(session.completedAt), 'HH:mm - dd/MM/yyyy')}</div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Duration */}
                              {duration && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Duración:</span>
                                  <span className="font-medium">{duration}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h4 className="text-2xl font-bold text-card-foreground">
                      {completedSessions.length}
                    </h4>
                    <p className="text-muted-foreground">Sesiones Capturadas</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Trophy className="h-12 w-12 text-accent mx-auto mb-4" />
                    <h4 className="text-2xl font-bold text-card-foreground">
                      {completedSessions.filter((s: MatchStatsSession) => s.sport === "padel").length}
                    </h4>
                    <p className="text-muted-foreground">Sesiones de Pádel</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Trophy className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h4 className="text-2xl font-bold text-card-foreground">
                      {completedSessions.filter((s: MatchStatsSession) => s.sport === "racquetball").length}
                    </h4>
                    <p className="text-muted-foreground">Sesiones de Racquetball</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
