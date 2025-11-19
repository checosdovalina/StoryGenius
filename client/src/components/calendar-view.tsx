import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy } from "lucide-react";
import type { Tournament } from "@shared/schema";
import { TournamentCalendarTab } from "@/components/tournament-calendar-tab";
import { AllTournamentsCalendar } from "@/components/all-tournaments-calendar";
import { useAuth } from "@/hooks/use-auth";

export function CalendarView() {
  const { user } = useAuth();
  const isAdminOrSuperAdmin = user?.role === "superadmin" || user?.role === "admin";
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    isAdminOrSuperAdmin ? "all" : ""
  );

  // Fetch all tournaments (backend filters based on user role)
  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"]
  });

  const availableTournaments = tournaments;

  if (tournamentsLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendario de Torneos</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedTournament = availableTournaments.find(t => t.id === selectedTournamentId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Calendario de Torneos
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Programa y gestiona partidos de tus torneos
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tournament selector */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">
              Selecciona un torneo
            </label>
            <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
              <SelectTrigger className="w-full sm:w-[400px]" data-testid="select-tournament">
                <SelectValue placeholder="Selecciona un torneo para ver su calendario" />
              </SelectTrigger>
              <SelectContent>
                {isAdminOrSuperAdmin && (
                  <SelectItem value="all" data-testid="option-all-tournaments">
                    📅 Todos los torneos
                  </SelectItem>
                )}
                {availableTournaments.length === 0 && !isAdminOrSuperAdmin ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No hay torneos disponibles
                  </div>
                ) : (
                  availableTournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Show calendar based on selection */}
          {selectedTournamentId === "all" ? (
            <AllTournamentsCalendar />
          ) : selectedTournament ? (
            <TournamentCalendarTab tournament={selectedTournament} />
          ) : (
            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
              <div className="text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Selecciona un torneo para ver y gestionar su calendario
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
