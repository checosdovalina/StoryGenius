import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Clock, Users } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { ScheduledMatch, Court } from "@shared/schema";

// Form validation schema for schedule match modal (Racquetball: singles or doubles)
const scheduleMatchSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  date: z.string().min(1, "La fecha es requerida"),
  time: z.string().min(1, "La hora es requerida"),
  sport: z.literal("racquetball"),
  matchType: z.enum(["singles", "doubles"], {
    required_error: "La modalidad es requerida"
  }),
  courtId: z.string().min(1, "La cancha es requerida"),
  duration: z.coerce.number().min(60).max(180),
  player1Name: z.string().min(1, "El nombre del jugador 1 es requerido"),
  player2Name: z.string().min(1, "El nombre del jugador 2 es requerido"),
  player3Name: z.string().optional(),
  player4Name: z.string().optional()
}).superRefine((data, ctx) => {
  // Doubles must have 4 players
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

type ScheduleMatchFormData = z.infer<typeof scheduleMatchSchema>;

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

  const { toast } = useToast();

  const form = useForm<ScheduleMatchFormData>({
    resolver: zodResolver(scheduleMatchSchema),
    defaultValues: {
      title: "",
      date: format(selectedDate, "yyyy-MM-dd"),
      time: "09:00",
      sport: "racquetball",
      matchType: "singles",
      duration: 90,
      player1Name: "",
      player2Name: "",
      player3Name: "",
      player4Name: ""
    }
  });

  const matchType = form.watch("matchType");

  // Update form date when selectedDate changes
  useEffect(() => {
    form.setValue("date", format(selectedDate, "yyyy-MM-dd"));
  }, [selectedDate, form]);

  const createMatchMutation = useMutation({
    mutationFn: async (data: ScheduleMatchFormData) => {
      const scheduledDate = new Date(`${data.date}T${data.time}:00`);
      
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
        status: "programado" as const
      };

      return apiRequest("POST", "/api/scheduled-matches", matchData);
    },
    onSuccess: () => {
      toast({
        title: "Partido programado",
        description: "El partido ha sido programado exitosamente"
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/scheduled-matches", "date", format(selectedDate, "yyyy-MM-dd")] 
      });
      form.reset();
      setShowScheduleModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo programar el partido",
        variant: "destructive"
      });
    }
  });

  const availableCourts = courts.filter(court => court.sport === "racquetball");

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
                                    {match.matchType === "doubles" ? (
                                      <span>
                                        {player1 || "J1"} & {player3 || "J3"} vs {player2 || "J2"} & {player4 || "J4"}
                                      </span>
                                    ) : (
                                      <span>
                                        {player1 || "Jugador 1"} vs {player2 || "Jugador 2"}
                                      </span>
                                    )}
                                    {match.sport === "padel" && (player3 || player4) && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        Padel (Legacy)
                                      </Badge>
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

      {/* Schedule Match Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Programar Nuevo Partido</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMatchMutation.mutate(data))} className="space-y-4">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título del Partido</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej: Partido amistoso, Entrenamiento, etc."
                        {...field}
                        data-testid="input-match-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
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

              {/* Duration */}
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (min)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={60} 
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

              {/* Court Selection */}
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
                        {availableCourts.map((court) => (
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

              {/* Match Type */}
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

              {/* Players */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Jugadores</h4>
                  <p className="text-sm text-muted-foreground">
                    {matchType === "doubles" 
                      ? "Dobles requiere 4 jugadores (2 vs 2)"
                      : "Singles requiere 2 jugadores (1 vs 1)"
                    }
                  </p>
                </div>
                
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

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowScheduleModal(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMatchMutation.isPending}
                  data-testid="button-submit-match"
                >
                  {createMatchMutation.isPending ? "Programando..." : "Programar Partido"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
