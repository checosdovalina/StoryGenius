import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trophy, Calendar, MapPin, Users, DollarSign, UserPlus, UserMinus } from "lucide-react";
import type { Tournament, TournamentRegistration } from "@shared/schema";

export function MyTournamentsView() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: allTournaments = [], isLoading: tournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"]
  });

  const { data: myTournaments = [], isLoading: myTournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/players", user?.id, "tournaments"],
    enabled: !!user?.id
  });

  const registerMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/register`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players", user?.id, "tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Inscripción exitosa",
        description: "Te has inscrito exitosamente al torneo."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error en inscripción",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const unregisterMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      await apiRequest("DELETE", `/api/tournaments/${tournamentId}/register`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players", user?.id, "tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Inscripción cancelada",
        description: "Has cancelado tu inscripción al torneo."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "registration": return "secondary";
      case "completed": return "outline";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Activo";
      case "registration": return "Inscripciones";
      case "completed": return "Completado";
      case "cancelled": return "Cancelado";
      case "draft": return "Borrador";
      default: return status;
    }
  };

  const getAvailableTournaments = () => {
    const myTournamentIds = myTournaments.map(t => t.id);
    return allTournaments.filter(tournament => 
      !myTournamentIds.includes(tournament.id) && 
      (tournament.status === 'registration' || tournament.status === 'draft')
    );
  };

  const getActiveTournaments = () => {
    return myTournaments.filter(t => t.status === 'active');
  };

  const getCompletedTournaments = () => {
    return myTournaments.filter(t => t.status === 'completed');
  };

  const handleRegister = (tournamentId: string) => {
    registerMutation.mutate(tournamentId);
  };

  const handleUnregister = (tournamentId: string) => {
    if (confirm("¿Estás seguro de que quieres cancelar tu inscripción a este torneo?")) {
      unregisterMutation.mutate(tournamentId);
    }
  };

  if (tournamentsLoading || myTournamentsLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-6">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <div className="space-y-2 mb-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeTournaments = getActiveTournaments();
  const availableTournaments = getAvailableTournaments();
  const completedTournaments = getCompletedTournaments();

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">Mis Torneos</h3>
        <p className="text-muted-foreground">Torneos en los que participas y torneos disponibles</p>
      </div>

      {/* Active Tournaments */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-card-foreground">Torneos Activos</h4>
        {activeTournaments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No tienes torneos activos</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTournaments.map((tournament) => (
              <Card key={tournament.id} data-testid={`active-tournament-${tournament.id}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="text-lg font-semibold text-card-foreground" data-testid={`tournament-name-${tournament.id}`}>
                        {tournament.name}
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        {tournament.sport.charAt(0).toUpperCase() + tournament.sport.slice(1)} - {tournament.format}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(tournament.status)}>
                      {getStatusLabel(tournament.status)}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Trophy className="w-4 h-4 mr-2" />
                      <span>Posición actual: En progreso</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span data-testid={`tournament-dates-${tournament.id}`}>
                        {new Date(tournament.startDate).toLocaleDateString('es-ES')} - {new Date(tournament.endDate).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{tournament.venue}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="secondary" className="flex-1" data-testid={`button-view-bracket-${tournament.id}`}>
                      Ver Bracket
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleUnregister(tournament.id)}
                      disabled={unregisterMutation.isPending}
                      data-testid={`button-unregister-${tournament.id}`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Available Tournaments */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-card-foreground">Torneos Disponibles</h4>
        {availableTournaments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No hay torneos disponibles para inscripción</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableTournaments.map((tournament) => (
              <Card key={tournament.id} data-testid={`available-tournament-${tournament.id}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="text-lg font-semibold text-card-foreground" data-testid={`available-tournament-name-${tournament.id}`}>
                        {tournament.name}
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        {tournament.sport.charAt(0).toUpperCase() + tournament.sport.slice(1)} - {tournament.format}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(tournament.status)}>
                      {getStatusLabel(tournament.status)}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span data-testid={`available-tournament-dates-${tournament.id}`}>
                        {new Date(tournament.startDate).toLocaleDateString('es-ES')} - {new Date(tournament.endDate).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{tournament.venue}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      <span>Max. {tournament.maxPlayers} jugadores</span>
                    </div>
                    {tournament.registrationFee && Number(tournament.registrationFee) > 0 && (
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span>${tournament.registrationFee} inscripción</span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleRegister(tournament.id)}
                    disabled={registerMutation.isPending}
                    data-testid={`button-register-${tournament.id}`}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Inscribirse
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tournaments */}
      {completedTournaments.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-card-foreground">Torneos Completados</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedTournaments.map((tournament) => (
              <Card key={tournament.id} data-testid={`completed-tournament-${tournament.id}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="text-lg font-semibold text-card-foreground">
                        {tournament.name}
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        {tournament.sport.charAt(0).toUpperCase() + tournament.sport.slice(1)} - {tournament.format}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(tournament.status)}>
                      {getStatusLabel(tournament.status)}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>
                        {new Date(tournament.startDate).toLocaleDateString('es-ES')} - {new Date(tournament.endDate).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{tournament.venue}</span>
                    </div>
                  </div>

                  <Button variant="secondary" className="w-full">
                    Ver Resultados
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
