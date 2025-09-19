import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Medal, Trophy, Award } from "lucide-react";
import type { PlayerStats, Tournament, User } from "@shared/schema";

export function RankingsView() {
  const { data: globalRankings = [], isLoading: globalLoading } = useQuery<PlayerStats[]>({
    queryKey: ["/api/rankings/global"]
  });

  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"]
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const activeTournaments = tournaments.filter(t => t.status === 'active');

  const getUserById = (id: string) => {
    return users.find(u => u.id === id);
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Medal className="h-6 w-6 text-yellow-500" />;
      case 2: return <Medal className="h-6 w-6 text-gray-400" />;
      case 3: return <Medal className="h-6 w-6 text-amber-600" />;
      default: return <div className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">{position}</div>;
    }
  };

  if (globalLoading || tournamentsLoading || usersLoading) {
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
                  const user = getUserById(stat.playerId);
                  const position = index + 1;
                  
                  if (!user) return null;
                  
                  return (
                    <div key={stat.id} className="flex items-center space-x-4" data-testid={`global-rank-${position}`}>
                      {getRankIcon(position)}
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-sm font-medium">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-card-foreground" data-testid={`player-name-${position}`}>
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.club || "Sin club"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-card-foreground" data-testid={`ranking-points-${position}`}>
                          {stat.rankingPoints}
                        </p>
                        <p className="text-xs text-muted-foreground">puntos</p>
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
              <Select>
                <SelectTrigger className="w-48">
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
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Selecciona un torneo para ver el ranking
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
