import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateTournamentModal } from "@/components/create-tournament-modal";
import { Plus, Calendar, MapPin, Users, Edit } from "lucide-react";
import type { Tournament } from "@shared/schema";

export function TournamentManagementView() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: tournaments = [], isLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"]
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Gestión de Torneos</h3>
          <p className="text-muted-foreground">Crea y administra torneos de pádel y raquetbol</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-tournament">
          <Plus className="mr-2 h-4 w-4" />
          Crear Torneo
        </Button>
      </div>

      {tournaments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No hay torneos creados</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear tu primer torneo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} data-testid={`tournament-card-${tournament.id}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-card-foreground" data-testid={`tournament-name-${tournament.id}`}>
                      {tournament.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {tournament.sport.charAt(0).toUpperCase() + tournament.sport.slice(1)} - {tournament.format}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(tournament.status)} data-testid={`tournament-status-${tournament.id}`}>
                    {getStatusLabel(tournament.status)}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span data-testid={`tournament-dates-${tournament.id}`}>
                      {new Date(tournament.startDate).toLocaleDateString('es-ES')} - {new Date(tournament.endDate).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span data-testid={`tournament-venue-${tournament.id}`}>{tournament.venue}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span data-testid={`tournament-players-${tournament.id}`}>
                      Max. {tournament.maxPlayers} jugadores
                    </span>
                  </div>
                  {tournament.registrationFee && Number(tournament.registrationFee) > 0 && (
                    <div className="flex items-center">
                      <span className="w-4 h-4 mr-2">$</span>
                      <span>${tournament.registrationFee} inscripción</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button variant="secondary" className="flex-1" data-testid={`button-view-bracket-${tournament.id}`}>
                    Ver Brackets
                  </Button>
                  <Button className="flex-1" data-testid={`button-edit-tournament-${tournament.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTournamentModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
}
