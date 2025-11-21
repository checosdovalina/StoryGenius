import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock, Users, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ScheduledMatch, Court, Tournament, Match } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Trophy } from "lucide-react";

interface TournamentCalendarTabProps {
  tournament: Tournament & { canManage?: boolean };
}

// Form schema with only racquetball support
const matchFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  scheduledDate: z.string().min(1, "La fecha es requerida"),
  time: z.string().min(1, "La hora es requerida"),
  sport: z.literal("racquetball"),
  matchType: z.enum(["singles", "doubles"], {
    required_error: "La modalidad es requerida"
  }),
  courtId: z.string().min(1, "La cancha es requerida"),
  duration: z.coerce.number().min(30).max(180, "Duración debe estar entre 30 y 180 min"),
  player1Name: z.string().min(1, "El nombre del jugador 1 es requerido"),
  player2Name: z.string().min(1, "El nombre del jugador 2 es requerido"),
  player3Name: z.string().optional(),
  player4Name: z.string().optional(),
  notes: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.matchType === "doubles") {
    if (!data.player3Name || data.player3Name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dobles requiere 4 jugadores",
        path: ["player3Name"]
      });
    }
    if (!data.player4Name || data.player4Name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dobles requiere 4 jugadores",
        path: ["player4Name"]
      });
    }
  }
});

type MatchFormData = z.infer<typeof matchFormSchema>;

export function TournamentCalendarTab({ tournament }: TournamentCalendarTabProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<ScheduledMatch | null>(null);
  const [deleteMatch, setDeleteMatch] = useState<ScheduledMatch | null>(null);
  const { toast } = useToast();

  // Check if user can manage tournament (SuperAdmin, Tournament Admin, or Organizer)
  const canManage = tournament.canManage;

  // Fetch courts for this tournament
  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
    select: (courts) => courts.filter(court => court.sport === "racquetball")
  });

  // Fetch scheduled matches for selected date
  const { data: scheduledMatches = [], isLoading: scheduledLoading } = useQuery<ScheduledMatch[]>({
    queryKey: [`/api/tournaments/${tournament.id}/scheduled-matches`, format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await fetch(
        `/api/tournaments/${tournament.id}/scheduled-matches?date=${format(selectedDate, "yyyy-MM-dd")}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    }
  });

  // Fetch tournament matches for selected date
  const { data: tournamentMatches = [], isLoading: tournamentLoading } = useQuery<Match[]>({
    queryKey: [`/api/tournaments/${tournament.id}/matches`],
    queryFn: async () => {
      const response = await fetch(
        `/api/tournaments/${tournament.id}/matches`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch tournament matches");
      return response.json();
    }
  });

  // Combine both match sources for calendar display
  const allMatches = useMemo(() => {
    const selected = format(selectedDate, "yyyy-MM-dd");
    const tournamentTimezone = tournament.timezone || "America/Mexico_City";
    
    // Filter tournament matches by selected date or show unscheduled on first day
    const filteredTournamentMatches = tournamentMatches
      .filter(match => {
        // Show matches with scheduled dates on their specific date
        if (match.scheduledAt) {
          const utcDate = new Date(match.scheduledAt);
          const zonedDate = toZonedTime(utcDate, tournamentTimezone);
          return format(zonedDate, "yyyy-MM-dd") === selected;
        }
        // Show unscheduled matches on first day of month
        return selected === format(new Date(tournamentTimezone), "yyyy-MM-01");
      })
      .map(match => ({
        id: match.id,
        title: `${match.round || "Partido"}${!match.scheduledAt ? " (sin fecha)" : ""}`,
        scheduledDate: match.scheduledAt || new Date().toISOString(),
        sport: "racquetball" as const,
        matchType: match.matchType as "singles" | "doubles",
        courtId: match.courtId || "",
        duration: 90,
        player1Name: "",
        player2Name: "",
        player3Name: "",
        player4Name: "",
        notes: ""
      })) as ScheduledMatch[];

    return [...scheduledMatches, ...filteredTournamentMatches];
  }, [scheduledMatches, tournamentMatches, selectedDate, tournament.timezone]);

  const isLoading = scheduledLoading || tournamentLoading;

  const form = useForm<MatchFormData>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      title: "",
      scheduledDate: format(selectedDate, "yyyy-MM-dd"),
      time: "09:00",
      sport: "racquetball",
      matchType: "singles",
      duration: 90,
      player1Name: "",
      player2Name: "",
      player3Name: "",
      player4Name: "",
      notes: ""
    }
  });

  const matchType = form.watch("matchType");

  // Create/Update match mutation
  const saveMatchMutation = useMutation({
    mutationFn: async (data: MatchFormData) => {
      // Interpret the date in the tournament's timezone
      const tournamentTimezone = tournament.timezone || "America/Mexico_City";
      const localDateString = `${data.scheduledDate}T${data.time}:00`;
      const scheduledDate = fromZonedTime(localDateString, tournamentTimezone);
      
      const matchData = {
        title: data.title,
        scheduledDate: scheduledDate.toISOString(),
        sport: data.sport,
        matchType: data.matchType,
        courtId: data.courtId,
        duration: data.duration,
        player1Name: data.player1Name,
        player2Name: data.player2Name,
        player3Name: data.matchType === "doubles" ? data.player3Name || null : null,
        player4Name: data.matchType === "doubles" ? data.player4Name || null : null,
        notes: data.notes,
        status: "programado" as const
      };

      if (editingMatch) {
        return apiRequest("PUT", `/api/tournaments/${tournament.id}/scheduled-matches/${editingMatch.id}`, matchData);
      } else {
        return apiRequest("POST", `/api/tournaments/${tournament.id}/scheduled-matches`, matchData);
      }
    },
    onSuccess: () => {
      toast({
        title: editingMatch ? "Partido actualizado" : "Partido programado",
        description: `El partido ha sido ${editingMatch ? "actualizado" : "programado"} exitosamente`
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tournaments/${tournament.id}/scheduled-matches`] 
      });
      form.reset();
      setShowMatchModal(false);
      setEditingMatch(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el partido",
        variant: "destructive"
      });
    }
  });

  // Delete match mutation
  const deleteMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      return apiRequest("DELETE", `/api/tournaments/${tournament.id}/scheduled-matches/${matchId}`);
    },
    onSuccess: () => {
      toast({
        title: "Partido eliminado",
        description: "El partido ha sido eliminado exitosamente"
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tournaments/${tournament.id}/scheduled-matches`] 
      });
      setDeleteMatch(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el partido",
        variant: "destructive"
      });
    }
  });

  const handleEdit = (match: ScheduledMatch) => {
    // Convert UTC date to tournament timezone for editing
    const tournamentTimezone = tournament.timezone || "America/Mexico_City";
    const utcDate = new Date(match.scheduledDate);
    const zonedDate = toZonedTime(utcDate, tournamentTimezone);
    
    form.reset({
      title: match.title,
      scheduledDate: format(zonedDate, "yyyy-MM-dd"),
      time: format(zonedDate, "HH:mm"),
      sport: "racquetball",
      matchType: match.matchType,
      courtId: match.courtId,
      duration: match.duration,
      player1Name: match.player1Name || "",
      player2Name: match.player2Name || "",
      player3Name: match.player3Name || "",
      player4Name: match.player4Name || "",
      notes: match.notes || ""
    });
    setEditingMatch(match);
    setShowMatchModal(true);
  };

  const handleCreate = () => {
    form.reset({
      title: "",
      scheduledDate: format(selectedDate, "yyyy-MM-dd"),
      time: "09:00",
      sport: "racquetball",
      matchType: "singles",
      duration: 90,
      player1Name: "",
      player2Name: "",
      player3Name: "",
      player4Name: "",
      notes: ""
    });
    setEditingMatch(null);
    setShowMatchModal(true);
  };

  const prevDay = () => {
    setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000));
  };

  const nextDay = () => {
    setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
  };

  const timeSlots = [
    "07:00", "08:30", "10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00", "20:30", "22:00"
  ];

  const getMatchesForSlot = (courtId: string, time: string) => {
    // Create slot times in tournament timezone
    const tournamentTimezone = tournament.timezone || "America/Mexico_City";
    const slotDateString = `${format(selectedDate, "yyyy-MM-dd")}T${time}:00`;
    const slotStartUtc = fromZonedTime(slotDateString, tournamentTimezone);
    const slotEndUtc = new Date(slotStartUtc.getTime() + 90 * 60 * 1000);

    return allMatches.filter(match => {
      if (match.courtId !== courtId) return false;
      
      const matchStart = new Date(match.scheduledDate);
      const matchEnd = new Date(matchStart.getTime() + match.duration * 60 * 1000);
      
      return matchStart < slotEndUtc && matchEnd > slotStartUtc;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Calendario de Partidos</h3>
          <p className="text-muted-foreground">
            {canManage ? "Programa y gestiona partidos del torneo" : "Visualiza tus partidos programados"}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevDay}
              data-testid="button-prev-day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[150px] text-center">
              {format(selectedDate, "EEEE dd/MM/yyyy", { locale: es })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextDay}
              data-testid="button-next-day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {canManage && (
            <Button 
              onClick={handleCreate}
              data-testid="button-create-match"
            >
              <Plus className="mr-2 h-4 w-4" />
              Programar Partido
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Programación del Día</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          ) : courts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay canchas de racquetball disponibles</p>
            </div>
          ) : (
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid gap-2" style={{gridTemplateColumns: `120px repeat(${courts.length}, 1fr)`}}>
                <div className="p-4 text-sm font-medium text-muted-foreground bg-muted rounded-t-lg">
                  Horario
                </div>
                {courts.map((court) => (
                  <div key={court.id} className="p-4 text-sm font-medium text-muted-foreground bg-muted rounded-t-lg" data-testid={`court-header-${court.id}`}>
                    {court.name}
                  </div>
                ))}
              </div>

              {/* Time slots */}
              <div className="border border-border rounded-b-lg">
                {timeSlots.map((time) => (
                  <div key={time} className="grid gap-2 border-b border-border last:border-b-0" style={{gridTemplateColumns: `120px repeat(${courts.length}, 1fr)`}}>
                    <div className="p-4 text-sm text-muted-foreground bg-muted/50" data-testid={`time-slot-${time}`}>
                      {time}
                    </div>
                    {courts.map((court) => {
                      const matches = getMatchesForSlot(court.id, time);
                      return (
                        <div key={court.id} className="p-2 border-r border-border last:border-r-0 min-h-[80px]" data-testid={`court-slot-${court.id}-${time}`}>
                          {matches.map((match) => {
                            // Convert UTC date to tournament timezone for display
                            const tournamentTimezone = tournament.timezone || "America/Mexico_City";
                            const utcDate = new Date(match.scheduledDate);
                            const zonedDate = toZonedTime(utcDate, tournamentTimezone);
                            const matchTime = format(zonedDate, "HH:mm");
                            
                            return (
                              <div
                                key={match.id}
                                className="bg-primary/10 border border-primary/20 rounded-md p-2 mb-2 text-xs hover:bg-primary/20 transition-colors"
                                data-testid={`match-${match.id}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-primary">{match.title}</span>
                                  {canManage && (
                                    <div className="flex space-x-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0"
                                        onClick={() => handleEdit(match)}
                                        data-testid={`button-edit-match-${match.id}`}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 text-destructive"
                                        onClick={() => setDeleteMatch(match)}
                                        data-testid={`button-delete-match-${match.id}`}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{matchTime} ({match.duration}min)</span>
                                </div>
                                
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  <div className="text-xs">
                                    {match.matchType === "doubles" ? (
                                      <span>
                                        {match.player1Name || "J1"} & {match.player3Name || "J3"} vs {match.player2Name || "J2"} & {match.player4Name || "J4"}
                                      </span>
                                    ) : (
                                      <span>
                                        {match.player1Name || "Jugador 1"} vs {match.player2Name || "Jugador 2"}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <Badge variant="outline" className="text-xs mt-1">
                                  {match.matchType === "singles" ? "Singles" : "Dobles"}
                                </Badge>

                                {/* Capture stats button for admin */}
                                {(user?.role === "superadmin" || user?.role === "admin") && match.status !== "completado" && (
                                  <Link href={`/stats/capture/${match.id}`}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full mt-2 text-xs h-7"
                                      data-testid={`button-capture-stats-${match.id}`}
                                    >
                                      <Trophy className="h-3 w-3 mr-1" />
                                      Capturar
                                    </Button>
                                  </Link>
                                )}
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

      {/* Create/Edit Match Dialog */}
      <Dialog open={showMatchModal} onOpenChange={(open) => {
        setShowMatchModal(open);
        if (!open) {
          setEditingMatch(null);
          form.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMatch ? "Editar Partido" : "Programar Nuevo Partido"}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => saveMatchMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título del Partido</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej: Semifinal A, Partido amistoso"
                        {...field}
                        data-testid="input-match-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          data-testid="input-match-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-match-time">
                            <SelectValue placeholder="Seleccionar hora" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="courtId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cancha</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-court">
                            <SelectValue placeholder="Seleccionar cancha" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courts.map((court) => (
                            <SelectItem key={court.id} value={court.id}>
                              {court.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración (min)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={30} 
                          max={180} 
                          step={30}
                          {...field}
                          data-testid="input-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="matchType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidad</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-match-type">
                          <SelectValue placeholder="Seleccionar modalidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="singles">Singles (1 vs 1)</SelectItem>
                        <SelectItem value="doubles">Dobles (2 vs 2)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <h4 className="font-medium">Jugadores</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="player1Name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{matchType === "doubles" ? "Equipo 1 - Jugador 1" : "Jugador 1"}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nombre del jugador"
                            {...field}
                            data-testid="input-player1"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="player2Name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{matchType === "doubles" ? "Equipo 2 - Jugador 1" : "Jugador 2"}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nombre del jugador"
                            {...field}
                            data-testid="input-player2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {matchType === "doubles" && (
                    <>
                      <FormField
                        control={form.control}
                        name="player3Name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Equipo 1 - Jugador 2</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Nombre del jugador"
                                {...field}
                                data-testid="input-player3"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="player4Name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Equipo 2 - Jugador 2</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Nombre del jugador"
                                {...field}
                                data-testid="input-player4"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notas adicionales sobre el partido"
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowMatchModal(false);
                    setEditingMatch(null);
                  }}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={saveMatchMutation.isPending}
                  data-testid="button-save-match"
                >
                  {saveMatchMutation.isPending ? "Guardando..." : editingMatch ? "Actualizar" : "Programar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteMatch} onOpenChange={() => setDeleteMatch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar partido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El partido "{deleteMatch?.title}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMatch && deleteMatchMutation.mutate(deleteMatch.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
