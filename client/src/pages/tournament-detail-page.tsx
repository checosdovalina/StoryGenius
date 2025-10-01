import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { useAuth } from "@/hooks/use-auth";
import { Tournament, User } from "@shared/schema";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Trophy, ArrowLeft, X, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { ViewType } from "@/pages/home-page";
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

export default function TournamentDetailPage() {
  const { id: tournamentId } = useParams();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<ViewType>("tournaments");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: tournament, isLoading } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${tournamentId}`],
    enabled: !!tournamentId
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

  const canManage = !!(user && (user.role === "admin" || tournament.organizerId === user.id));

  // ------------------ 3. Main page ------------------
  return (
    <div className="flex h-screen bg-background"> {/* 3.1 Sidebar container */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="flex-1 overflow-auto"> {/* 3.2 Main content */}
        <Header
          currentView="tournaments"
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className="p-6"> {/* 3.3 Page padding */}
          {/* Header with tournament info */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Link
                to="/"
                className="flex items-center text-blue-600 hover:text-blue-800"
                data-testid="link-back-tournaments"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Volver a Torneos
              </Link>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
              <div>
                <h1
                  className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
                  data-testid={`text-tournament-name-${tournament.id}`}
                >
                  {tournament.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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

              <div className="flex items-center gap-2">
                <Badge
                  variant={tournament.status === "active" ? "default" : "secondary"}
                  data-testid={`badge-status-${tournament.id}`}
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
                  <Button
                    variant="outline"
                    data-testid={`button-edit-tournament-${tournament.id}`}
                  >
                    Editar Torneo
                  </Button>
                )}
              </div>
            </div>

            {tournament.description && (
              <p
                className="mt-4 text-gray-700 dark:text-gray-300"
                data-testid={`text-description-${tournament.id}`}
              >
                {tournament.description}
              </p>
            )}
          </div>

          {/* Main content tabs */}
          <Tabs defaultValue="players" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="players" data-testid="tab-players">
                Jugadores
              </TabsTrigger>
              <TabsTrigger value="matches" data-testid="tab-matches">
                Partidos
              </TabsTrigger>
              {/* <TabsTrigger value="brackets" data-testid="tab-brackets">Brackets</TabsTrigger> */}
            </TabsList>

            <TabsContent value="players" className="mt-6">
              <PlayersTab tournament={tournament} canManage={canManage} />
            </TabsContent>

            <TabsContent value="matches" className="mt-6">
              <MatchesTab tournament={tournament} canManage={canManage} />
            </TabsContent>

            {/* <TabsContent value="brackets" className="mt-6">
              <BracketsTab tournament={tournament} canManage={canManage} />
            </TabsContent> */}
          </Tabs>
        </div>
      </main>
    </div>
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

  // Get all users for registration dropdown
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: canManage
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

  // Filter available users (not already registered)
  const registeredPlayerIds = players.map(p => p.id);
  const availableUsers = allUsers.filter(user => !registeredPlayerIds.includes(user.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Jugadores Registrados ({players.length}/{tournament.maxPlayers})</span>
          {canManage && (
            <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-player">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Agregar Jugador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {tournament.sport === "padel" ? "Registrar Pareja" : "Registrar Jugador"}
                  </DialogTitle>
                  <DialogDescription>
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
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createPairMutation.isPending || registerWithPairMutation.isPending}
                          data-testid="button-confirm-padel-register"
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
                                <SelectTrigger data-testid="select-player">
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
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={registerMutation.isPending}
                          data-testid="button-confirm-register"
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
          <div className="space-y-4">
            {players.map((player, index) => (
              <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`player-card-${player.id}`}>
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white" data-testid={`player-name-${player.id}`}>
                      {player.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400" data-testid={`player-email-${player.id}`}>
                      {player.email}
                    </p>
                    {player.club && (
                      <p className="text-xs text-gray-400" data-testid={`player-club-${player.id}`}>
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
                      size="sm"
                      onClick={() => unregisterMutation.mutate(player.id)}
                      disabled={unregisterMutation.isPending}
                      data-testid={`button-unregister-${player.id}`}
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
  player1Id: z.string().min(1, "Selecciona el primer jugador"),
  player2Id: z.string().min(1, "Selecciona el segundo jugador"),
  round: z.string().optional(),
  scheduledAt: z.string().optional(),
  courtId: z.string().optional()
}).refine(data => data.player1Id !== data.player2Id, {
  message: "Los jugadores deben ser diferentes",
  path: ["player2Id"]
});

type CreateMatchForm = z.infer<typeof createMatchSchema>;

function MatchesTab({ tournament, canManage }: { tournament: Tournament; canManage?: boolean }) {
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const { toast } = useToast();

  const { data: matches = [], isLoading: matchesLoading, error: matchesError } = useQuery<Match[]>({
    queryKey: [`/api/tournaments/${tournament.id}/matches`]
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const { data: players = [] } = useQuery<User[]>({
    queryKey: [`/api/tournaments/${tournament.id}/players`]
  });

  const { data: courts = [] } = useQuery<any[]>({
    queryKey: ["/api/courts"]
  });

  const matchForm = useForm<CreateMatchForm>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      player1Id: "",
      player2Id: "",
      round: "",
      scheduledAt: "",
      courtId: ""
    }
  });

  const createMatchMutation = useMutation({
    mutationFn: async (data: CreateMatchForm) => {
      const matchData = {
        ...data,
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

  const getUserById = (id: string) => {
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
            >
              Crear Partido Manual
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
          <div className="space-y-4" data-testid="matches-list">
            {matches.map((match) => {
              const player1 = getUserById(match.player1Id);
              const player2 = getUserById(match.player2Id);

              return (
                <Card key={match.id} className="p-4" data-testid={`match-item-${match.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium" data-testid={`match-round-${match.id}`}>
                          {match.round}
                        </span>
                        <Badge variant="outline">Partido {match.bracketPosition}</Badge>
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
                    <div className={`p-3 rounded-lg border text-center ${match.winnerId === match.player1Id ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-muted/50"}`}>
                      <div className="font-medium" data-testid={`match-player1-${match.id}`}>
                        {player1?.name || "TBD"}
                      </div>
                      {match.status === "completed" && (
                        <div className="text-lg font-bold mt-1">
                          {match.player1Sets || 0}
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="text-xl font-bold text-muted-foreground">VS</div>
                    </div>

                    <div className={`p-3 rounded-lg border text-center ${match.winnerId === match.player2Id ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-muted/50"}`}>
                      <div className="font-medium" data-testid={`match-player2-${match.id}`}>
                        {player2?.name || "TBD"}
                      </div>
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
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create Match Modal */}
      <Dialog open={showCreateMatchModal} onOpenChange={setShowCreateMatchModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle data-testid="title-create-match-modal">Crear Partido Manual</DialogTitle>
            <DialogDescription>
              Crea un partido manual para este torneo seleccionando los jugadores.
            </DialogDescription>
          </DialogHeader>
          <Form {...matchForm}>
            <form onSubmit={matchForm.handleSubmit((data) => createMatchMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={matchForm.control}
                  name="player1Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jugador 1</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-player1">
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
                          <SelectTrigger data-testid="select-player2">
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

              <FormField
                control={matchForm.control}
                name="round"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ronda (Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Ronda 1, Semifinal, Final" data-testid="input-match-round" />
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
                        <SelectTrigger data-testid="select-court">
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
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMatchMutation.isPending}
                  data-testid="button-submit-match"
                >
                  {createMatchMutation.isPending ? "Creando..." : "Crear Partido"}
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

  const getUserById = (id: string) => {
    return users.find(u => u.id === id);
  };

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
                    const player1 = getUserById(match.player1Id);
                    const player2 = getUserById(match.player2Id);

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