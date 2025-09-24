import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Clock, Users } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import type { ScheduledMatch, Court } from "@shared/schema";

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const { data: courts = [], isLoading: courtsLoading } = useQuery<Court[]>({
    queryKey: ["/api/courts"]
  });

  const { data: scheduledMatches = [], isLoading: matchesLoading } = useQuery<ScheduledMatch[]>({
    queryKey: ["/api/scheduled-matches", "date", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await fetch(`/api/scheduled-matches?date=${format(selectedDate, "yyyy-MM-dd")}`);
      if (!response.ok) throw new Error("Failed to fetch scheduled matches");
      return response.json();
    }
  });

  const timeSlots = [
    "09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00", "19:30"
  ];

  const getMatchesForSlot = (courtId: string, time: string) => {
    const slotStart = new Date(`${format(selectedDate, "yyyy-MM-dd")}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + 90 * 60 * 1000); // 1.5 hours

    return scheduledMatches.filter(match => {
      if (match.courtId !== courtId) return false;
      
      const matchStart = new Date(match.scheduledDate);
      const matchEnd = new Date(matchStart.getTime() + match.duration * 60 * 1000);
      
      // Check if there's any overlap
      return matchStart < slotEnd && matchEnd > slotStart;
    });
  };

  const getPlayerDisplayName = (match: ScheduledMatch, playerNum: 1 | 2 | 3 | 4) => {
    const playerId = match[`player${playerNum}Id`];
    const playerName = match[`player${playerNum}Name`];
    
    // For now, show the name if available, otherwise show placeholder
    // In a full implementation, you'd fetch user names from the player IDs
    return playerName || (playerId ? `Jugador ${playerNum}` : null);
  };

  if (courtsLoading || matchesLoading) {
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
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}
              data-testid="button-prev-day"
            >
              ←
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(selectedDate, "EEEE dd/MM", { locale: es })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
              data-testid="button-next-day"
            >
              →
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="secondary" data-testid="button-export-pdf">
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button 
              onClick={() => setShowScheduleModal(true)}
              data-testid="button-schedule-match"
            >
              <Plus className="mr-2 h-4 w-4" />
              Programar Partido
            </Button>
          </div>
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
                    {courts.slice(0, 7).map((court) => {
                      const matches = getMatchesForSlot(court.id, time);
                      return (
                        <div key={court.id} className="p-2 border-r border-border last:border-r-0 min-h-[60px]" data-testid={`court-slot-${court.id}-${time}`}>
                          {matches.map((match) => {
                            const player1 = getPlayerDisplayName(match, 1);
                            const player2 = getPlayerDisplayName(match, 2);
                            const player3 = getPlayerDisplayName(match, 3);
                            const player4 = getPlayerDisplayName(match, 4);
                            
                            const matchTime = format(new Date(match.scheduledDate), "HH:mm");
                            
                            return (
                              <div
                                key={match.id}
                                className="bg-primary/10 border border-primary/20 rounded-md p-2 mb-2 text-xs"
                                data-testid={`match-${match.id}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-primary">{match.title}</span>
                                  <Badge
                                    variant={
                                      match.status === "completado" ? "default" :
                                      match.status === "en_curso" ? "secondary" :
                                      match.status === "confirmado" ? "outline" : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {match.status}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{matchTime}</span>
                                  <span>({match.duration}min)</span>
                                </div>
                                
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  <div className="text-xs">
                                    {match.sport === "padel" ? (
                                      <span>
                                        {player1 && player2 ? `${player1} / ${player2}` : player1 || player2 || "Jugadores TBD"}
                                        {(player3 || player4) && " vs "}
                                        {player3 && player4 ? `${player3} / ${player4}` : player3 || player4 || ""}
                                      </span>
                                    ) : (
                                      <span>
                                        {player1 || "Jugador 1"} vs {player2 || "Jugador 2"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
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
