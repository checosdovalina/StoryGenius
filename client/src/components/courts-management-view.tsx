import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Clock, Wrench, Calendar, Edit } from "lucide-react";
import type { Court } from "@shared/schema";

export function CourtsManagementView() {
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: courts = [], isLoading } = useQuery<Court[]>({
    queryKey: ["/api/courts"]
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "available": return "default";
      case "maintenance": return "secondary";
      case "blocked": return "destructive";
      default: return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available": return "Disponible";
      case "maintenance": return "Mantenimiento";
      case "blocked": return "Bloqueada";
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
          <h3 className="text-lg font-semibold text-card-foreground">Gestión de Canchas</h3>
          <p className="text-muted-foreground">Administra canchas, horarios y disponibilidad</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-new-court">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cancha
        </Button>
      </div>

      {courts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No hay canchas registradas</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear tu primera cancha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courts.map((court) => (
            <Card key={court.id} data-testid={`court-card-${court.id}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-card-foreground" data-testid={`court-name-${court.id}`}>
                      {court.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {court.sport.charAt(0).toUpperCase() + court.sport.slice(1)}
                      {court.description && ` - ${court.description}`}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(court.status)} data-testid={`court-status-${court.id}`}>
                    {getStatusLabel(court.status)}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span data-testid={`court-hours-${court.id}`}>
                      {court.startTime} - {court.endTime}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Wrench className="w-4 h-4 mr-2" />
                    <span>
                      {court.maintenanceUntil ? 
                        `Mantenimiento hasta ${new Date(court.maintenanceUntil).toLocaleDateString('es-ES')}` :
                        "Sin mantenimiento programado"
                      }
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>0 partidos programados hoy</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="secondary" className="flex-1" data-testid={`button-court-schedule-${court.id}`}>
                    Horarios
                  </Button>
                  <Button className="flex-1" data-testid={`button-edit-court-${court.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
