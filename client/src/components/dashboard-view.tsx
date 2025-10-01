import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Calendar, MapPin } from "lucide-react";
import type { Tournament, User, Court } from "@shared/schema";

interface DashboardStats {
  activeTournaments: number;
  totalPlayers: number;
  todayMatches: number;
  availableCourts: number;
}

export function DashboardView() {
  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"]
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const { data: courts = [], isLoading: courtsLoading } = useQuery<Court[]>({
    queryKey: ["/api/courts"]
  });

  const stats: DashboardStats = {
    activeTournaments: tournaments.filter((t) => t.status === 'active').length,
    totalPlayers: users.filter((u) => u.role === 'jugador').length,
    todayMatches: 0,
    availableCourts: courts.filter((c) => c.status === 'available').length
  };

  const statCards = [
    {
      title: "Torneos Activos",
      value: stats.activeTournaments,
      icon: Trophy,
      color: "text-accent",
      loading: tournamentsLoading
    },
    {
      title: "Jugadores Registrados",
      value: stats.totalPlayers,
      icon: Users,
      color: "text-primary",
      loading: usersLoading
    },
    {
      title: "Partidos Hoy",
      value: stats.todayMatches,
      icon: Calendar,
      color: "text-info",
      loading: false
    },
    {
      title: "Canchas Disponibles",
      value: stats.availableCourts,
      icon: MapPin,
      color: "text-warning",
      loading: courtsLoading
    }
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} data-testid={`stat-card-${index}`}>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{stat.title}</p>
                    {stat.loading ? (
                      <Skeleton className="h-6 md:h-8 w-12 md:w-16 mt-1 md:mt-2" />
                    ) : (
                      <p className="text-xl md:text-2xl font-bold text-card-foreground" data-testid={`stat-value-${index}`}>
                        {stat.value}
                      </p>
                    )}
                  </div>
                  <Icon className={`h-6 w-6 md:h-8 md:w-8 ${stat.color} shrink-0`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity and Upcoming Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card data-testid="recent-activity-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:space-y-4">
              {tournamentsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Skeleton className="h-4 w-3/4 mb-1" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : tournaments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay actividad reciente
                </p>
              ) : (
                tournaments.slice(0, 3).map((tournament, index: number) => (
                  <div key={tournament.id} className="flex items-center space-x-3" data-testid={`activity-item-${index}`}>
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center shrink-0">
                      <Trophy className="text-primary-foreground text-xs" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-card-foreground truncate">Torneo "{tournament.name}" creado</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tournament.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="upcoming-matches-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Próximos Partidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay partidos programados
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
