import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus } from "lucide-react";
import type { Match, Court } from "@shared/schema";

export function CalendarView() {
  const { data: courts = [], isLoading: courtsLoading } = useQuery<Court[]>({
    queryKey: ["/api/courts"]
  });

  const timeSlots = [
    "09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00", "19:30"
  ];

  if (courtsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Calendario de Partidos</h3>
          <p className="text-muted-foreground">Programación y asignación de canchas</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="secondary" data-testid="button-export-pdf">
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button data-testid="button-schedule-match">
            <Plus className="mr-2 h-4 w-4" />
            Programar Partido
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Programación del Día</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {courts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay canchas disponibles</p>
            </div>
          ) : (
            <div className="min-w-[800px]">
              {/* Header */}
              <div className={`grid grid-cols-${Math.min(courts.length + 1, 8)} bg-muted rounded-t-lg`}>
                <div className="p-4 text-sm font-medium text-muted-foreground">
                  Horario
                </div>
                {courts.slice(0, 7).map((court) => (
                  <div key={court.id} className="p-4 text-sm font-medium text-muted-foreground" data-testid={`court-header-${court.id}`}>
                    {court.name}
                  </div>
                ))}
              </div>

              {/* Time slots */}
              <div className="border border-t-0 border-border rounded-b-lg">
                {timeSlots.map((time, index) => (
                  <div key={time} className={`grid grid-cols-${Math.min(courts.length + 1, 8)} border-b border-border last:border-b-0`}>
                    <div className="p-4 text-sm text-muted-foreground bg-muted/50" data-testid={`time-slot-${time}`}>
                      {time}
                    </div>
                    {courts.slice(0, 7).map((court) => (
                      <div key={court.id} className="p-2 border-r border-border last:border-r-0 min-h-[60px]" data-testid={`court-slot-${court.id}-${time}`}>
                        {/* Empty slot - matches would be rendered here */}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
