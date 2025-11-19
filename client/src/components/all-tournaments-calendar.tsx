import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, MapPin, Trophy } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { utcToZonedTime } from "date-fns-tz";
import type { ScheduledMatch, Court, Tournament } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export function AllTournamentsCalendar() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch all scheduled matches for the selected date
  const { data: scheduledMatches = [], isLoading: matchesLoading } = useQuery<ScheduledMatch[]>({
    queryKey: ["/api/scheduled-matches", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await fetch(
        `/api/scheduled-matches?date=${format(selectedDate, "yyyy-MM-dd")}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    }
  });

  // Fetch courts for display
  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"]
  });

  // Fetch tournaments for display
  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"]
  });

  const getCourtName = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    return court?.name || "Cancha desconocida";
  };

  const getTournamentName = (tournamentId: string | null) => {
    if (!tournamentId) return "Sin torneo";
    const tournament = tournaments.find(t => t.id === tournamentId);
    return tournament?.name || "Torneo desconocido";
  };

  const getTournament = (tournamentId: string | null) => {
    if (!tournamentId) return null;
    return tournaments.find(t => t.id === tournamentId) || null;
  };

  const getPlayerDisplay = (match: ScheduledMatch) => {
    if (match.matchType === "doubles") {
      return `${match.player1Name || "J1"} & ${match.player3Name || "J3"} vs ${match.player2Name || "J2"} & ${match.player4Name || "J4"}`;
    }
    return `${match.player1Name || "Jugador 1"} vs ${match.player2Name || "Jugador 2"}`;
  };

  // Group matches by tournament
  const matchesByTournament = scheduledMatches.reduce((acc, match) => {
    const tournamentId = match.tournamentId || "no-tournament";
    if (!acc[tournamentId]) {
      acc[tournamentId] = [];
    }
    acc[tournamentId].push(match);
    return acc;
  }, {} as Record<string, ScheduledMatch[]>);

  // Sort matches within each tournament by time
  Object.keys(matchesByTournament).forEach(tournamentId => {
    matchesByTournament[tournamentId].sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  });

  if (matchesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          data-testid="button-prev-day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg font-semibold">
            {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          data-testid="button-next-day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Matches list */}
      {scheduledMatches.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">
              No hay partidos programados para este día
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(matchesByTournament).map(([tournamentId, matches]) => (
            <Card key={tournamentId}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {getTournamentName(tournamentId === "no-tournament" ? null : tournamentId)}
                  <Badge variant="secondary" className="ml-2">
                    {matches.length} {matches.length === 1 ? "partido" : "partidos"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`match-${match.id}`}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-base">{match.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Users className="h-4 w-4" />
                              <span>{getPlayerDisplay(match)}</span>
                              <Badge variant="outline" className="ml-2">
                                {match.matchType === "singles" ? "Singles" : "Dobles"}
                              </Badge>
                            </div>
                          </div>
                          <Badge
                            variant={
                              match.status === "completado" ? "default" :
                              match.status === "en_curso" ? "secondary" :
                              match.status === "confirmado" ? "outline" : "secondary"
                            }
                          >
                            {match.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {(() => {
                                const tournament = getTournament(match.tournamentId);
                                const timezone = tournament?.timezone || "America/Mexico_City";
                                const utcDate = new Date(match.scheduledDate);
                                const zonedDate = utcToZonedTime(utcDate, timezone);
                                return format(zonedDate, "HH:mm");
                              })()}
                            </span>
                            <span>({match.duration} min)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{getCourtName(match.courtId)}</span>
                          </div>
                        </div>

                        {match.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            {match.notes}
                          </p>
                        )}

                        {/* Capture stats button for admin */}
                        {(user?.role === "superadmin" || user?.role === "admin") && match.status !== "completado" && (
                          <div className="mt-3 pt-3 border-t">
                            <Link href={`/stats/capture/${match.id}`}>
                              <Button
                                variant="default"
                                size="sm"
                                className="w-full"
                                data-testid={`button-capture-stats-${match.id}`}
                              >
                                <Trophy className="h-4 w-4 mr-2" />
                                Capturar estadísticas
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
