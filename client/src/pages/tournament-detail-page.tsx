import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { useAuth } from "@/hooks/use-auth";
import { Tournament, User, Club, updateTournamentSchema } from "@shared/schema";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Trophy, ArrowLeft, X, UserPlus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { Match } from "@shared/schema";
import { TournamentRolesTab } from "@/components/tournament-roles-tab";
import { ExcelImportDialog } from "@/components/excel-import-dialog";

// =======================
// 1️⃣ Página principal
// =======================
export default function TournamentDetailPage() {
  const { id: tournamentId } = useParams();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // =======================
  // 2️⃣ Obtener torneo y clubes
  // =======================
  const { data: tournament, isLoading } = useQuery<Tournament & { canManage?: boolean }>({
    queryKey: [`/api/tournaments/${tournamentId}`],
    enabled: !!tournamentId
  });

  const { data: clubs } = useQuery<Club[]>({
    queryKey: ["/api/clubs"]
  });

  // Edit tournament form
  type UpdateTournamentForm = z.infer<typeof updateTournamentSchema>;
  const editForm = useForm<UpdateTournamentForm>({
    resolver: zodResolver(updateTournamentSchema),
    defaultValues: {
      name: "",
      description: "",
      sport: "padel",
      format: "elimination",
      venue: "",
      timezone: "America/Mexico_City",
      startDate: undefined,
      endDate: undefined,
      maxPlayers: 8,
      registrationFee: "0",
    },
  });

  // Reset form when tournament data loads
  useEffect(() => {
    if (tournament && clubs) {
      const clubId = tournament.clubId || clubs.find(c => c.name === tournament.venue)?.id || "";
      editForm.reset({
        name: tournament.name,
        description: tournament.description || "",
        sport: tournament.sport,
        format: tournament.format,
        venue: clubId,
        timezone: tournament.timezone || "America/Mexico_City",
        startDate: tournament.startDate as any,
        endDate: tournament.endDate as any,
        maxPlayers: tournament.maxPlayers,
        registrationFee: tournament.registrationFee || "0",
      });
    }
  }, [tournament, clubs, editForm]);

  // Update tournament mutation
  const updateTournamentMutation = useMutation({
    mutationFn: async (data: UpdateTournamentForm) => {
      const selectedClub = clubs?.find(c => c.id === data.venue);
      const updateData = {
        ...data,
        clubId: data.venue || undefined,
        venue: selectedClub?.name || data.venue,
        timezone: data.timezone || "America/Mexico_City",
      };
      const res = await apiRequest("PUT", `/api/tournaments/${tournamentId}`, updateData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      setEditDialogOpen(false);
      toast({
        title: "Torneo actualizado",
        description: "Los cambios han sido guardados correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el torneo.",
        variant: "destructive",
      });
    },
  });

  // Delete tournament mutation
  const deleteTournamentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/tournaments/${tournamentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Torneo eliminado",
        description: "El torneo ha sido eliminado correctamente.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el torneo.",
        variant: "destructive",
      });
    },
  });

  // ------------------ 1. Loading state ------------------
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Cargando torneo...</div>
      </div>
    );
  }

  // ------------------ 2. Tournament not found ------------------
  if (!tournament) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Torneo no encontrado</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            El torneo que buscas no existe o ha sido eliminado.
          </p>
          <Link to="/" className="mt-4 inline-block">
            <Button data-testid="button-back-home">Volver al inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Use canManage from backend (includes superadmin and tournament_admin roles)
  const canManage = tournament.canManage || false;

  // ------------------ 3. Main page ------------------
  return (
    <AppShell>
      <div className="p-4 sm:p-6">{/* Page padding */}
          {/* Header with tournament info */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              <Link
                to="/tournaments"
                className="flex items-center text-blue-600 hover:text-blue-800 min-h-[44px] py-2"
                data-testid="link-back-tournaments"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Volver a Torneos
              </Link>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start gap-3 sm:gap-4">
              <div>
                <h1
                  className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2"
                  data-testid={`text-tournament-name-${tournament.id}`}
                >
                  {tournament.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    <span className="capitalize">
                      {tournament.sport} - {tournament.format}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(tournament.startDate), "dd/MM/yyyy")} -{" "}
                      {format(new Date(tournament.endDate), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{tournament.venue}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>Máx. {tournament.maxPlayers} jugadores</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={tournament.status === "active" ? "default" : "secondary"}
                  data-testid={`badge-status-${tournament.id}`}
                  className="text-sm"
                >
                  {tournament.status === "draft"
                    ? "Borrador"
                    : tournament.status === "active"
                    ? "Activo"
                    : tournament.status === "completed"
                    ? "Completado"
                    : tournament.status}
                </Badge>
                {canManage && (
                  <>
                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          data-testid={`button-edit-tournament-${tournament.id}`}
                          className="min-h-[44px]"
                          aria-label="Editar torneo"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Editar Torneo</DialogTitle>
                          <DialogDescription>
                            Modifica los detalles del torneo
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...editForm}>
                          <form onSubmit={editForm.handleSubmit((data) => updateTournamentMutation.mutate(data))} className="space-y-4">
                            <FormField
                              control={editForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nombre del Torneo</FormLabel>
                                  <FormControl>
                                    <Input {...field} data-testid="input-edit-name" className="min-h-[44px]" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Descripción</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} value={field.value || ""} data-testid="input-edit-description" className="min-h-[44px]" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={editForm.control}
                                name="sport"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Deporte</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-edit-sport" className="min-h-[44px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="padel">Padel</SelectItem>
                                        <SelectItem value="racquetball">Racquetball</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="format"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Formato</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-edit-format" className="min-h-[44px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="elimination">Eliminación</SelectItem>
                                        <SelectItem value="round_robin">Round Robin</SelectItem>
                                        <SelectItem value="groups">Grupos</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={editForm.control}
                                name="venue"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Sede/Club</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-edit-club" className="min-h-[44px]">
                                          <SelectValue placeholder="Seleccionar club" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {clubs?.map((club) => (
                                          <SelectItem key={club.id} value={club.id}>
                                            {club.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="timezone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Zona Horaria</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-edit-timezone" className="min-h-[44px]">
                                          <SelectValue placeholder="Seleccionar zona horaria" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="America/Mexico_City">Ciudad de México (GMT-6)</SelectItem>
                                        <SelectItem value="America/Monterrey">Monterrey (GMT-6)</SelectItem>
                                        <SelectItem value="America/Cancun">Cancún (GMT-5)</SelectItem>
                                        <SelectItem value="America/Tijuana">Tijuana (GMT-8)</SelectItem>
                                        <SelectItem value="America/Chihuahua">Chihuahua (GMT-7)</SelectItem>
                                        <SelectItem value="America/Hermosillo">Hermosillo (GMT-7)</SelectItem>
                                        <SelectItem value="America/Mazatlan">Mazatlán (GMT-7)</SelectItem>
                                        <SelectItem value="America/Merida">Mérida (GMT-6)</SelectItem>
                                        <SelectItem value="America/New_York">Nueva York (GMT-5)</SelectItem>
                                        <SelectItem value="America/Los_Angeles">Los Ángeles (GMT-8)</SelectItem>
                                        <SelectItem value="America/Chicago">Chicago (GMT-6)</SelectItem>
                                        <SelectItem value="America/Denver">Denver (GMT-7)</SelectItem>
                                        <SelectItem value="America/Phoenix">Phoenix (GMT-7)</SelectItem>
                                        <SelectItem value="America/Bogota">Bogotá (GMT-5)</SelectItem>
                                        <SelectItem value="America/Lima">Lima (GMT-5)</SelectItem>
                                        <SelectItem value="America/Santiago">Santiago (GMT-3)</SelectItem>
                                        <SelectItem value="America/Buenos_Aires">Buenos Aires (GMT-3)</SelectItem>
                                        <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                                        <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                                        <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={editForm.control}
                                name="startDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Fecha de Inicio</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...field}
                                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                        data-testid="input-edit-start-date"
                                        className="min-h-[44px]"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="endDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Fecha de Fin</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...field}
                                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                        data-testid="input-edit-end-date"
                                        className="min-h-[44px]"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={editForm.control}
                                name="maxPlayers"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Máximo de Jugadores</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        data-testid="input-edit-max-players"
                                        className="min-h-[44px]"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="registrationFee"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Cuota de Inscripción</FormLabel>
                                    <FormControl>
                                      <Input {...field} type="number" step="0.01" data-testid="input-edit-registration-fee" className="min-h-[44px]" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit" className="min-h-[44px]">
                                Cancelar
                              </Button>
                              <Button type="submit" disabled={updateTournamentMutation.isPending} data-testid="button-save-edit" className="min-h-[44px]">
                                {updateTournamentMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          data-testid={`button-delete-tournament-${tournament.id}`}
                          className="min-h-[44px]"
                          aria-label="Eliminar torneo"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el torneo
                            y todos sus datos asociados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete" className="min-h-[44px]">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteTournamentMutation.mutate()}
                            disabled={deleteTournamentMutation.isPending}
                            data-testid="button-confirm-delete"
                            className="min-h-[44px] bg-destructive hover:bg-destructive/90"
                          >
                            {deleteTournamentMutation.isPending ? "Eliminando..." : "Eliminar"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>

            {tournament.description && (
              <p
                className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-700 dark:text-gray-300"
                data-testid={`text-description-${tournament.id}`}
              >
                {tournament.description}
              </p>
            )}
          </div>

          {/* Main content tabs */}
          <Tabs defaultValue="players" className="w-full">
            <TabsList className={`grid w-full ${canManage ? 'grid-cols-4' : 'grid-cols-2'}`}>
              <TabsTrigger value="players" data-testid="tab-players" className="min-h-[44px]">
                Jugadores
              </TabsTrigger>
              <TabsTrigger value="matches" data-testid="tab-matches" className="min-h-[44px]">
                Partidos
              </TabsTrigger>
              {canManage && (
                <>
                  <TabsTrigger value="import" data-testid="tab-import" className="min-h-[44px]">
                    Importar
                  </TabsTrigger>
                  <TabsTrigger value="roles" data-testid="tab-roles" className="min-h-[44px]">
                    Roles
                  </TabsTrigger>
                </>
              )}
              {/* <TabsTrigger value="brackets" data-testid="tab-brackets">Brackets</TabsTrigger> */}
            </TabsList>

            <TabsContent value="players" className="mt-4 sm:mt-6">
              <PlayersTab tournament={tournament} canManage={canManage} />
            </TabsContent>

            <TabsContent value="matches" className="mt-4 sm:mt-6">
              <MatchesTab tournament={tournament} canManage={canManage} />
            </TabsContent>

            {canManage && (
              <>
                <TabsContent value="import" className="mt-4 sm:mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Importación Masiva</CardTitle>
                      <CardDescription>
                        Importa jugadores y partidos desde archivos Excel para cargar datos de forma rápida y eficiente
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="flex-1 space-y-2">
                          <h4 className="font-medium">Importar Jugadores</h4>
                          <p className="text-sm text-muted-foreground">
                            Carga jugadores individuales (Singles) o parejas (Doubles) desde un archivo Excel. 
                            Los jugadores serán automáticamente registrados en este torneo.
                          </p>
                          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                            <li>Si el jugador no existe, se creará automáticamente</li>
                            <li>Se requiere nombre y categoría para cada jugador</li>
                            <li>Para doubles, necesitas dos nombres por pareja</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="flex-1 space-y-2">
                          <h4 className="font-medium">Importar Partidos</h4>
                          <p className="text-sm text-muted-foreground">
                            Programa partidos de Singles o Doubles especificando fecha, hora y jugadores.
                            Los jugadores deben existir previamente en el sistema.
                          </p>
                          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                            <li>Los jugadores deben estar registrados antes de importar partidos</li>
                            <li>Formato de fecha: YYYY-MM-DD (ej: 2024-12-25)</li>
                            <li>Formato de hora: HH:MM (ej: 14:30)</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex justify-center pt-4">
                        <ExcelImportDialog tournamentId={tournament.id} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="roles" className="mt-4 sm:mt-6">
                  <TournamentRolesTab tournament={tournament} />
                </TabsContent>
              </>
            )}

            {/* <TabsContent value="brackets" className="mt-6">
              <BracketsTab tournament={tournament} canManage={canManage} />
            </TabsContent> */}
          </Tabs>
      </div>
    </AppShell>
  );
}


const registerPlayerSchema = z.object({
  playerId: z.string().min(1, "Debe seleccionar un jugador")
});

const padelRegistrationSchema = z.object({
  partnerName: z.string().min(1, "El nombre de la pareja es requerido"),
  partnerPhone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos")
});

function PlayersTab({ tournament, canManage }: { tournament: Tournament; canManage?: boolean }) {
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [searchingPartner, setSearchingPartner] = useState(false);
  const [foundPartner, setFoundPartner] = useState<User | null>(null);
  const { toast } = useToast();

  // Get tournament players
  const { data: players = [], isLoading: loadingPlayers } = useQuery<(User & { registeredAt: string })[]>({
    queryKey: [`/api/tournaments/${tournament.id}/players`]
  });

  // Get all users for registration dropdown (needed for viewing player names too)
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  // Register player mutation
  const registerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const response = await apiRequest("POST", `/api/tournaments/${tournament.id}/register-player`, { playerId });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament.id}/players`] });
      setShowRegisterDialog(false);
      toast({ title: "Jugador registrado exitosamente", variant: "default" });
    },
    onError: () => {
      toast({ title: "Error al registrar jugador", variant: "destructive" });
    }
  });

  // Unregister player mutation
  const unregisterMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const response = await apiRequest("DELETE", `/api/tournaments/${tournament.id}/players/${playerId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament.id}/players`] });
      toast({ title: "Jugador desregistrado exitosamente", variant: "default" });
    },
    onError: () => {
      toast({ title: "Error al desregistrar jugador", variant: "destructive" });
    }
  });

  // Search partner by phone mutation
  const searchPartnerMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await apiRequest("GET", `/api/users/search-by-phone/${phone}`);
      return await response.json();
    },
    onSuccess: (data) => {
      setFoundPartner(data);
      setSearchingPartner(false);
    },
    onError: () => {
      setFoundPartner(null);
      setSearchingPartner(false);
    }
  });

  // Create padel pair mutation
  const createPairMutation = useMutation({
    mutationFn: async (pairData: { player2Id?: string; player2Name?: string; player2Phone?: string }) => {
      console.log("Creating pair with data:", pairData);
      const response = await apiRequest("POST", "/api/padel-pairs", pairData);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create pair: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log("Pair created successfully:", result);
      return result;
    },
    onError: (error) => {
      console.error("Error creating pair:", error);
      toast({
        title: "Error al crear pareja",
        description: error.message || "No se pudo crear la pareja",
        variant: "destructive"
      });
    }
  });

  // Register with pair mutation
  const registerWithPairMutation = useMutation({
    mutationFn: async (pairId?: string) => {
      console.log("Registering with pair ID:", pairId);
      const response = await apiRequest("POST", `/api/tournaments/${tournament.id}/register-with-pair`, { pairId });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to register with pair: ${response.status} ${errorText}`);
      }

      console.log("Registration successful");
      return response;
    },
    onSuccess: () => {
      console.log("Registration mutation onSuccess called");
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament.id}/players`] });
      setShowRegisterDialog(false);
      setFoundPartner(null);
      padelForm.reset();
      toast({ title: "Pareja registrada exitosamente en el torneo", variant: "default" });
    },
    onError: (error) => {
      console.error("Error registering with pair:", error);
      toast({ 
        title: "Error al registrar pareja en el torneo", 
        description: error.message || "Error desconocido",
        variant: "destructive" 
      });
    }
  });

  const form = useForm<z.infer<typeof registerPlayerSchema>>({
    resolver: zodResolver(registerPlayerSchema),
    defaultValues: { playerId: "" }
  });

  const padelForm = useForm<z.infer<typeof padelRegistrationSchema>>({
    resolver: zodResolver(padelRegistrationSchema),
    defaultValues: { 
      partnerName: "",
      partnerPhone: ""
    }
  });

  const onSubmit = (values: z.infer<typeof registerPlayerSchema>) => {
    registerMutation.mutate(values.playerId);
  };

  const onPadelSubmit = async (values: z.infer<typeof padelRegistrationSchema>) => {
    console.log("onPadelSubmit called with values:", values);
    console.log("foundPartner:", foundPartner);

    try {
      let pairData;

      if (foundPartner) {
        // Partner is already registered - use their ID
        pairData = { player2Id: foundPartner.id };
        console.log("Using existing partner with ID:", foundPartner.id);
      } else {
        // Partner is not registered yet - store their name and phone
        pairData = {
          player2Name: values.partnerName,
          player2Phone: values.partnerPhone
        };
        console.log("Creating new partner with data:", pairData);
      }

      console.log("About to create pair...");
      // Create the pair first
      const pair = await createPairMutation.mutateAsync(pairData);
      console.log("Pair created, about to register...");

      // Then register with the pair
      await registerWithPairMutation.mutateAsync(pair.id);
      console.log("Registration completed successfully");
    } catch (error) {
      console.error("Error in onPadelSubmit:", error);
      toast({ 
        title: "Error al crear pareja", 
        description: error instanceof Error ? error.message : "No se pudo crear la pareja y registrar en el torneo",
        variant: "destructive" 
      });
    }
  };

  const searchPartner = async (phone: string) => {
    if (phone.length >= 10) {
      setSearchingPartner(true);
      searchPartnerMutation.mutate(phone);
    }
  };

  // Filter available users (not already registered) - memoized
  const availableUsers = useMemo(() => {
    const registeredPlayerIds = players.map(p => p.id);
    return allUsers.filter(user => !registeredPlayerIds.includes(user.id));
  }, [players, allUsers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Jugadores Registrados ({players.length}/{tournament.maxPlayers})</span>
          {canManage && (
            <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-player" className="min-h-[44px] text-sm" aria-label="Agregar jugador al torneo">
                  <UserPlus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Agregar Jugador</span>
                  <span className="sm:hidden">Agregar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">
                    {tournament.sport === "padel" ? "Registrar Pareja" : "Registrar Jugador"}
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    {tournament.sport === "padel" 
                      ? "Proporciona la información de tu pareja para el torneo de padel."
                      : "Selecciona un jugador para registrar en este torneo."
                    }
                  </DialogDescription>
                </DialogHeader>

                {tournament.sport === "padel" ? (
                  <Form {...padelForm}>
                    <form onSubmit={padelForm.handleSubmit(onPadelSubmit)} className="space-y-4">
                      <FormField
                        control={padelForm.control}
                        name="partnerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de la pareja</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Nombre completo de tu pareja"
                                {...field}
                                data-testid="input-partner-name"
                                className="min-h-[44px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={padelForm.control}
                        name="partnerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono de la pareja</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Número de teléfono"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  searchPartner(e.target.value);
                                }}
                                data-testid="input-partner-phone"
                                className="min-h-[44px]"
                              />
                            </FormControl>
                            <FormDescription>
                              {searchingPartner ? "Buscando..." : 
                               foundPartner ? `✓ Usuario encontrado: ${foundPartner.name}` :
                               field.value.length >= 10 ? "Usuario no encontrado - se creará una invitación" : 
                               "Introduce el teléfono para buscar si ya está registrado"
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowRegisterDialog(false);
                            setFoundPartner(null);
                            padelForm.reset();
                          }}
                          data-testid="button-cancel-padel-register"
                          className="min-h-[44px]"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createPairMutation.isPending || registerWithPairMutation.isPending}
                          data-testid="button-confirm-padel-register"
                          className="min-h-[44px]"
                        >
                          {createPairMutation.isPending || registerWithPairMutation.isPending ? "Registrando..." : "Registrar Pareja"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="playerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Jugador</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-player" className="min-h-[44px]">
                                  <SelectValue placeholder="Seleccionar jugador..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableUsers.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowRegisterDialog(false)}
                          data-testid="button-cancel-register"
                          className="min-h-[44px]"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={registerMutation.isPending}
                          data-testid="button-confirm-register"
                          className="min-h-[44px]"
                        >
                          {registerMutation.isPending ? "Registrando..." : "Registrar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
        <CardDescription>
          Gestiona los jugadores registrados en este torneo
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadingPlayers ? (
          <div className="text-center py-8" data-testid="loading-players">
            <p>Cargando jugadores...</p>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400" data-testid="text-no-players">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay jugadores registrados aún</p>
            <p className="text-sm">Los jugadores aparecerán aquí cuando se registren</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {players.map((player, index) => (
              <div key={player.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3" data-testid={`player-card-${player.id}`}>
                <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                  <div className="h-10 w-10 flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate" data-testid={`player-name-${player.id}`}>
                      {player.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate" data-testid={`player-email-${player.id}`}>
                      {player.email}
                    </p>
                    {player.club && (
                      <p className="text-xs text-gray-400 truncate" data-testid={`player-club-${player.id}`}>
                        {player.club}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" data-testid={`player-registered-date-${player.id}`}>
                    {format(new Date(player.registeredAt), 'dd/MM/yyyy')}
                  </Badge>
                  {canManage && (
                    <Button
                      variant="outline"
                      onClick={() => unregisterMutation.mutate(player.id)}
                      disabled={unregisterMutation.isPending}
                      data-testid={`button-unregister-${player.id}`}
                      className="min-h-[44px] min-w-[44px] p-2"
                      aria-label={`Eliminar a ${player.name} del torneo`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const createMatchSchema = z.object({
  matchType: z.enum(["singles", "doubles"]),
  player1Id: z.string().min(1, "Selecciona el primer jugador"),
  player2Id: z.string().min(1, "Selecciona el segundo jugador"),
  player3Id: z.string().optional(),
  player4Id: z.string().optional(),
  round: z.string().optional(),
  scheduledAt: z.string().optional(),
  courtId: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.matchType === "singles") {
    if (data.player1Id === data.player2Id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los jugadores deben ser diferentes",
        path: ["player2Id"]
      });
    }
  } else {
    if (!data.player3Id || data.player3Id === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona el tercer jugador",
        path: ["player3Id"]
      });
    }
    if (!data.player4Id || data.player4Id === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona el cuarto jugador",
        path: ["player4Id"]
      });
    }
    const playerIds = [data.player1Id, data.player2Id, data.player3Id || "", data.player4Id || ""].filter(id => id !== "");
    const uniqueIds = new Set(playerIds);
    if (uniqueIds.size !== playerIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Todos los jugadores deben ser diferentes",
        path: ["player4Id"]
      });
    }
  }
});

type CreateMatchForm = z.infer<typeof createMatchSchema>;

// Helper functions moved outside component for performance
const getUserById = (users: User[], id: string) => {
  return users.find(u => u.id === id);
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "completed": return "default";
    case "in_progress": return "secondary";
    case "scheduled": return "outline";
    default: return "outline";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "completed": return "Completado";
    case "in_progress": return "En Progreso";
    case "scheduled": return "Programado";
    default: return status;
  }
};

function MatchesTab({ tournament, canManage }: { tournament: Tournament; canManage?: boolean }) {
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: matches = [], isLoading: matchesLoading, error: matchesError } = useQuery<Match[]>({
    queryKey: [`/api/tournaments/${tournament.id}/matches`]
  });

  // Fetch users for displaying player names (needed by all viewers)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const { data: players = [] } = useQuery<User[]>({
    queryKey: [`/api/tournaments/${tournament.id}/players`],
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });

  // Only fetch courts if user canManage (optimization)
  const { data: allCourts = [] } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    enabled: canManage
  });

  // Filter courts to show only those from the same club as the tournament - memoized
  const courts = useMemo(() => 
    allCourts.filter(court => court.clubId === tournament.clubId && court.sport === tournament.sport),
    [allCourts, tournament.clubId, tournament.sport]
  );

  const matchForm = useForm<CreateMatchForm>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      matchType: "singles",
      player1Id: "",
      player2Id: "",
      player3Id: "",
      player4Id: "",
      round: "",
      scheduledAt: "",
      courtId: ""
    }
  });

  const matchType = matchForm.watch("matchType");

  const createMatchMutation = useMutation({
    mutationFn: async (data: CreateMatchForm) => {
      const matchData = {
        matchType: data.matchType,
        player1Id: data.player1Id,
        player2Id: data.player2Id,
        player3Id: data.matchType === "doubles" ? data.player3Id : null,
        player4Id: data.matchType === "doubles" ? data.player4Id : null,
        tournamentId: tournament.id,
        scheduledAt: data.scheduledAt && data.scheduledAt.trim() !== "" ? new Date(data.scheduledAt).toISOString() : null,
        round: data.round && data.round.trim() !== "" ? data.round : "Ronda Manual",
        courtId: !data.courtId || data.courtId === "none" || data.courtId.trim() === "" ? null : data.courtId
      };
      const res = await apiRequest("POST", "/api/matches", matchData);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${await res.text()}`);
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament.id}/matches`] });
      setShowCreateMatchModal(false);
      matchForm.reset();
      toast({
        title: "Partido creado",
        description: "El partido manual se ha creado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear el partido",
        variant: "destructive",
      });
    }
  });

  // Edit match mutation
  const editMatchMutation = useMutation({
    mutationFn: async (data: CreateMatchForm & { matchId: string }) => {
      const matchData = {
        matchType: data.matchType,
        player1Id: data.player1Id,
        player2Id: data.player2Id,
        player3Id: data.matchType === "doubles" ? data.player3Id : null,
        player4Id: data.matchType === "doubles" ? data.player4Id : null,
        round: data.round && data.round.trim() !== "" ? data.round : null,
        scheduledAt: data.scheduledAt && data.scheduledAt.trim() !== "" ? new Date(data.scheduledAt).toISOString() : null,
        courtId: !data.courtId || data.courtId === "none" || data.courtId.trim() === "" ? null : data.courtId
      };
      const res = await apiRequest("PUT", `/api/matches/${data.matchId}`, matchData);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${await res.text()}`);
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament.id}/matches`] });
      setEditingMatch(null);
      matchForm.reset();
      toast({
        title: "Partido actualizado",
        description: "El partido se ha actualizado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el partido",
        variant: "destructive",
      });
    }
  });

  // Delete match mutation
  const deleteMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await apiRequest("DELETE", `/api/matches/${matchId}`);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${await res.text()}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament.id}/matches`] });
      toast({
        title: "Partido eliminado",
        description: "El partido se ha eliminado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el partido",
        variant: "destructive",
      });
    }
  });


  if (matchesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Partidos</CardTitle>
          <CardDescription>Cargando partidos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8" data-testid="loading-matches">
            <p>Cargando partidos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Partidos ({matches.length})</span>
          {canManage && (
            <Button 
              onClick={() => setShowCreateMatchModal(true)}
              data-testid="button-create-match"
              className="min-h-[44px] text-sm"
              aria-label="Crear partido manual"
            >
              <span className="hidden sm:inline">Crear Partido Manual</span>
              <span className="sm:hidden">Crear Partido</span>
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Visualiza y gestiona los partidos del torneo
        </CardDescription>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400" data-testid="text-no-matches">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay partidos programados aún</p>
            <p className="text-sm">Los partidos aparecerán cuando se generen los brackets</p>
          </div>
        ) : (
          <div className="space-y-4 overflow-x-auto" data-testid="matches-list">
            {matches.map((match) => {
              const player1 = getUserById(users, match.player1Id);
              const player2 = getUserById(users, match.player2Id);
              const player3 = match.player3Id ? getUserById(users, match.player3Id) : null;
              const player4 = match.player4Id ? getUserById(users, match.player4Id) : null;
              const isDoubles = match.matchType === "doubles";
              const team1Won = match.winnerId === match.player1Id || (isDoubles && match.winnerId === match.player3Id);
              const team2Won = match.winnerId === match.player2Id || (isDoubles && match.winnerId === match.player4Id);

              return (
                <Card key={match.id} className="p-3 sm:p-4" data-testid={`match-item-${match.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-medium" data-testid={`match-round-${match.id}`}>
                          {match.round}
                        </span>
                        <Badge variant="outline">Partido {match.bracketPosition}</Badge>
                        <Badge variant="secondary" data-testid={`match-type-badge-${match.id}`}>
                          {isDoubles ? "Doubles" : "Singles"}
                        </Badge>
                      </div>
                      {match.scheduledAt && (
                        <p className="text-sm text-muted-foreground">
                          📅 {format(new Date(match.scheduledAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                    <Badge variant={getStatusBadgeVariant(match.status)} data-testid={`match-status-badge-${match.id}`}>
                      {getStatusLabel(match.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className={`p-3 rounded-lg border text-center ${team1Won ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-muted/50"}`}>
                      {isDoubles ? (
                        <div>
                          <div className="font-medium text-sm" data-testid={`match-team1-${match.id}`}>
                            {player1?.name || "TBD"} & {player3?.name || "TBD"}
                          </div>
                        </div>
                      ) : (
                        <div className="font-medium" data-testid={`match-player1-${match.id}`}>
                          {player1?.name || "TBD"}
                        </div>
                      )}
                      {match.status === "completed" && (
                        <div className="text-lg font-bold mt-1">
                          {match.player1Sets || 0}
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="text-xl font-bold text-muted-foreground">VS</div>
                    </div>

                    <div className={`p-3 rounded-lg border text-center ${team2Won ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-muted/50"}`}>
                      {isDoubles ? (
                        <div>
                          <div className="font-medium text-sm" data-testid={`match-team2-${match.id}`}>
                            {player2?.name || "TBD"} & {player4?.name || "TBD"}
                          </div>
                        </div>
                      ) : (
                        <div className="font-medium" data-testid={`match-player2-${match.id}`}>
                          {player2?.name || "TBD"}
                        </div>
                      )}
                      {match.status === "completed" && (
                        <div className="text-lg font-bold mt-1">
                          {match.player2Sets || 0}
                        </div>
                      )}
                    </div>
                  </div>

                  {match.duration && (
                    <div className="mt-3 pt-3 border-t text-center text-sm text-muted-foreground">
                      ⏱️ Duración: {match.duration} minutos
                    </div>
                  )}

                  {/* Capture stats button for admin and escribano */}
                  {(user?.role === "admin" || user?.role === "escribano") && match.status !== "completed" && (
                    <div className="mt-4 pt-4 border-t">
                      <Link href={`/stats/capture/${match.id}`}>
                        <Button
                          variant="default"
                          size="sm"
                          data-testid={`button-capture-stats-${match.id}`}
                          className="w-full min-h-[44px]"
                          aria-label="Capturar estadísticas del partido"
                        >
                          <Trophy className="h-4 w-4 mr-2" />
                          Capturar estadísticas
                        </Button>
                      </Link>
                    </div>
                  )}

                  {/* Admin actions */}
                  {user?.role === "admin" && (
                    <div className="mt-4 pt-4 border-t flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingMatch(match);
                          matchForm.reset({
                            matchType: match.matchType || "singles",
                            player1Id: match.player1Id,
                            player2Id: match.player2Id,
                            player3Id: match.player3Id || "",
                            player4Id: match.player4Id || "",
                            round: match.round || "",
                            scheduledAt: match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : "",
                            courtId: match.courtId || ""
                          });
                        }}
                        data-testid={`button-edit-match-${match.id}`}
                        className="min-h-[44px]"
                        aria-label="Editar partido"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            data-testid={`button-delete-match-${match.id}`}
                            className="min-h-[44px]"
                            aria-label="Eliminar partido"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar partido?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. El partido será eliminado permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-match-${match.id}`} className="min-h-[44px]">
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMatchMutation.mutate(match.id)}
                              disabled={deleteMatchMutation.isPending}
                              data-testid={`button-confirm-delete-match-${match.id}`}
                              className="min-h-[44px] bg-destructive hover:bg-destructive/90"
                            >
                              {deleteMatchMutation.isPending ? "Eliminando..." : "Eliminar"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create Match Modal */}
      <Dialog open={showCreateMatchModal} onOpenChange={setShowCreateMatchModal}>
        <DialogContent className="sm:max-w-[500px] mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="title-create-match-modal" className="text-lg sm:text-xl">Crear Partido Manual</DialogTitle>
            <DialogDescription className="text-sm">
              Crea un partido manual para este torneo seleccionando los jugadores.
            </DialogDescription>
          </DialogHeader>
          <Form {...matchForm}>
            <form onSubmit={matchForm.handleSubmit((data) => createMatchMutation.mutate(data))} className="space-y-4">
              <FormField
                control={matchForm.control}
                name="matchType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-match-type" className="min-h-[44px]">
                          <SelectValue placeholder="Selecciona modalidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="singles">Singles</SelectItem>
                        <SelectItem value="doubles">Doubles</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={matchForm.control}
                  name="player1Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jugador 1</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-player1" className="min-h-[44px]">
                            <SelectValue placeholder="Selecciona jugador 1" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id} data-testid={`player1-option-${player.id}`}>
                              {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={matchForm.control}
                  name="player2Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jugador 2</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-player2" className="min-h-[44px]">
                            <SelectValue placeholder="Selecciona jugador 2" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id} data-testid={`player2-option-${player.id}`}>
                              {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {matchType === "doubles" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={matchForm.control}
                    name="player3Id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jugador 3</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-player3" className="min-h-[44px]">
                              <SelectValue placeholder="Selecciona jugador 3" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {players.map((player) => (
                              <SelectItem key={player.id} value={player.id} data-testid={`player3-option-${player.id}`}>
                                {player.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={matchForm.control}
                    name="player4Id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jugador 4</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-player4" className="min-h-[44px]">
                              <SelectValue placeholder="Selecciona jugador 4" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {players.map((player) => (
                              <SelectItem key={player.id} value={player.id} data-testid={`player4-option-${player.id}`}>
                                {player.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={matchForm.control}
                name="round"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ronda (Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Ronda 1, Semifinal, Final" data-testid="input-match-round" className="min-h-[44px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={matchForm.control}
                name="courtId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancha (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-court" className="min-h-[44px]">
                          <SelectValue placeholder="Selecciona una cancha" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin cancha asignada</SelectItem>
                        {courts.map((court) => (
                          <SelectItem key={court.id} value={court.id} data-testid={`court-option-${court.id}`}>
                            {court.name} - {court.sport}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={matchForm.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y Hora (Opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="datetime-local" 
                        data-testid="input-match-datetime"
                        className="min-h-[44px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateMatchModal(false)}
                  data-testid="button-cancel-match"
                  className="min-h-[44px]"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMatchMutation.isPending}
                  data-testid="button-submit-match"
                  className="min-h-[44px]"
                >
                  {createMatchMutation.isPending ? "Creando..." : "Crear Partido"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Match Modal */}
      <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}>
        <DialogContent className="sm:max-w-[500px] mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="title-edit-match-modal" className="text-lg sm:text-xl">Editar Partido</DialogTitle>
            <DialogDescription className="text-sm">
              Modifica los detalles del partido
            </DialogDescription>
          </DialogHeader>
          <Form {...matchForm}>
            <form onSubmit={matchForm.handleSubmit((data) => editingMatch && editMatchMutation.mutate({ ...data, matchId: editingMatch.id }))} className="space-y-4">
              <FormField
                control={matchForm.control}
                name="matchType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-match-type" className="min-h-[44px]">
                          <SelectValue placeholder="Selecciona modalidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="singles">Singles</SelectItem>
                        <SelectItem value="doubles">Doubles</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={matchForm.control}
                  name="player1Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jugador 1</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-player1" className="min-h-[44px]">
                            <SelectValue placeholder="Selecciona jugador 1" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id} data-testid={`edit-player1-option-${player.id}`}>
                              {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={matchForm.control}
                  name="player2Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jugador 2</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-player2" className="min-h-[44px]">
                            <SelectValue placeholder="Selecciona jugador 2" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id} data-testid={`edit-player2-option-${player.id}`}>
                              {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {matchType === "doubles" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={matchForm.control}
                    name="player3Id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jugador 3</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-player3" className="min-h-[44px]">
                              <SelectValue placeholder="Selecciona jugador 3" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {players.map((player) => (
                              <SelectItem key={player.id} value={player.id} data-testid={`edit-player3-option-${player.id}`}>
                                {player.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={matchForm.control}
                    name="player4Id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jugador 4</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-player4" className="min-h-[44px]">
                              <SelectValue placeholder="Selecciona jugador 4" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {players.map((player) => (
                              <SelectItem key={player.id} value={player.id} data-testid={`edit-player4-option-${player.id}`}>
                                {player.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={matchForm.control}
                name="round"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ronda (Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Ronda 1, Semifinal, Final" data-testid="input-edit-match-round" className="min-h-[44px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={matchForm.control}
                name="courtId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancha (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-court" className="min-h-[44px]">
                          <SelectValue placeholder="Selecciona una cancha" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin cancha asignada</SelectItem>
                        {courts.map((court) => (
                          <SelectItem key={court.id} value={court.id} data-testid={`edit-court-option-${court.id}`}>
                            {court.name} - {court.sport}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={matchForm.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y Hora (Opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="datetime-local" 
                        data-testid="input-edit-match-datetime"
                        className="min-h-[44px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingMatch(null)}
                  data-testid="button-cancel-edit-match"
                  className="min-h-[44px]"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={editMatchMutation.isPending}
                  data-testid="button-save-edit-match"
                  className="min-h-[44px]"
                >
                  {editMatchMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function BracketsTab({ tournament, canManage }: { tournament: Tournament; canManage?: boolean }) {
  const { toast } = useToast();

  const { data: matches = [], isLoading: matchesLoading, error: matchesError } = useQuery<Match[]>({
    queryKey: [`/api/tournaments/${tournament.id}/matches`]
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const generateBracketsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/tournaments/${tournament.id}/generate-brackets`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament.id}/matches`] });
      toast({ title: "Brackets generados exitosamente", variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al generar brackets", description: error.message, variant: "destructive" });
    }
  });

  const organizedMatches = matches.reduce<Record<string, Match[]>>((acc, match) => {
    const round = match.round || "Round 1";
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});

  if (matchesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brackets</CardTitle>
          <CardDescription>Cargando brackets...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8" data-testid="loading-brackets">
            <p>Cargando brackets...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Brackets</span>
          {canManage && matches.length === 0 && (
            <Button 
              onClick={() => generateBracketsMutation.mutate()}
              disabled={generateBracketsMutation.isPending}
              data-testid="button-generate-brackets"
            >
              {generateBracketsMutation.isPending ? "Generando..." : "Generar Brackets"}
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Visualiza la estructura del torneo y los brackets
        </CardDescription>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400" data-testid="text-no-brackets">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Los brackets no han sido generados aún</p>
            <p className="text-sm">Se generarán automáticamente cuando haya suficientes jugadores</p>
          </div>
        ) : (
          <div className="space-y-6" data-testid="brackets-display">
            {Object.entries(organizedMatches).map(([round, roundMatches]) => (
              <div key={round} className="space-y-4">
                <h4 className="text-lg font-semibold text-card-foreground" data-testid={`round-title-${round}`}>
                  {round}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roundMatches.map((match: Match, index: number) => {
                    const player1 = getUserById(users, match.player1Id);
                    const player2 = getUserById(users, match.player2Id);

                    return (
                      <Card key={match.id} className="border-2" data-testid={`match-card-${match.id}`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              Partido {match.bracketPosition}
                            </span>
                            <Badge 
                              variant={match.status === "completed" ? "default" : match.status === "in_progress" ? "secondary" : "outline"}
                              data-testid={`match-status-${match.id}`}
                            >
                              {match.status === "completed" ? "Completado" : 
                               match.status === "in_progress" ? "En Progreso" : "Programado"}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <div className={`flex justify-between items-center p-2 rounded ${match.winnerId === match.player1Id ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : ""}`}>
                              <span className="font-medium" data-testid={`player1-name-${match.id}`}>
                                {player1?.name || "TBD"}
                              </span>
                              {match.status === "completed" && (
                                <span className="font-bold">
                                  {match.player1Sets || 0}
                                </span>
                              )}
                            </div>

                            <div className="text-center text-xs text-muted-foreground">VS</div>

                            <div className={`flex justify-between items-center p-2 rounded ${match.winnerId === match.player2Id ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : ""}`}>
                              <span className="font-medium" data-testid={`player2-name-${match.id}`}>
                                {player2?.name || "TBD"}
                              </span>
                              {match.status === "completed" && (
                                <span className="font-bold">
                                  {match.player2Sets || 0}
                                </span>
                              )}
                            </div>
                          </div>

                          {match.scheduledAt && (
                            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                              📅 {format(new Date(match.scheduledAt), 'dd/MM/yyyy HH:mm')}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
