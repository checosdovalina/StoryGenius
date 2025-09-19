import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Tournament, User, Match } from "@shared/schema";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Users, Trophy, ArrowLeft, UserPlus, X } from "lucide-react";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export default function TournamentDetailPage() {
  const { id: tournamentId } = useParams();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: tournament, isLoading } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${tournamentId}`],
    enabled: !!tournamentId
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Cargando torneo...</div>
      </div>
    );
  }

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

  const canManage = !!(user && (user.role === 'admin' || tournament.organizerId === user.id));

  return (
    <div className="min-h-screen bg-background">
      <Header currentView="tournaments" onToggleSidebar={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header with tournament info */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800" data-testid="link-back-tournaments">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver a Torneos
            </Link>
          </div>
          
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid={`text-tournament-name-${tournament.id}`}>
                {tournament.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span className="capitalize">{tournament.sport} - {tournament.format}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(tournament.startDate), 'dd/MM/yyyy')} - {format(new Date(tournament.endDate), 'dd/MM/yyyy')}
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
              <Badge variant={tournament.status === 'active' ? 'default' : 'secondary'} data-testid={`badge-status-${tournament.id}`}>
                {tournament.status === 'draft' ? 'Borrador' : 
                 tournament.status === 'active' ? 'Activo' : 
                 tournament.status === 'completed' ? 'Completado' : tournament.status}
              </Badge>
              {canManage && (
                <Button variant="outline" data-testid={`button-edit-tournament-${tournament.id}`}>
                  Editar Torneo
                </Button>
              )}
            </div>
          </div>
          
          {tournament.description && (
            <p className="mt-4 text-gray-700 dark:text-gray-300" data-testid={`text-description-${tournament.id}`}>
              {tournament.description}
            </p>
          )}
        </div>

        {/* Main content tabs */}
        <Tabs defaultValue="players" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="players" data-testid="tab-players">Jugadores</TabsTrigger>
            <TabsTrigger value="matches" data-testid="tab-matches">Partidos</TabsTrigger>
            <TabsTrigger value="brackets" data-testid="tab-brackets">Brackets</TabsTrigger>
          </TabsList>
          
          <TabsContent value="players" className="mt-6">
            <PlayersTab tournament={tournament} canManage={canManage} />
          </TabsContent>
          
          <TabsContent value="matches" className="mt-6">
            <MatchesTab tournament={tournament} canManage={canManage} />
          </TabsContent>
          
          <TabsContent value="brackets" className="mt-6">
            <BracketsTab tournament={tournament} canManage={canManage} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

const registerPlayerSchema = z.object({
  playerId: z.string().min(1, "Debe seleccionar un jugador")
});

function PlayersTab({ tournament, canManage }: { tournament: Tournament; canManage?: boolean }) {
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const { toast } = useToast();

  // Get tournament players
  const { data: players = [], isLoading: loadingPlayers } = useQuery<Array<User & { registeredAt: string }>>({
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

  const form = useForm<z.infer<typeof registerPlayerSchema>>({
    resolver: zodResolver(registerPlayerSchema),
    defaultValues: { playerId: "" }
  });

  const onSubmit = (values: z.infer<typeof registerPlayerSchema>) => {
    registerMutation.mutate(values.playerId);
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Jugador</DialogTitle>
                  <DialogDescription>
                    Selecciona un jugador para registrar en este torneo.
                  </DialogDescription>
                </DialogHeader>
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

function MatchesTab({ tournament, canManage }: { tournament: Tournament; canManage?: boolean }) {
  const { data: matches = [], isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: [`/api/tournaments/${tournament.id}/matches`]
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"]
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
            <Button data-testid="button-create-match">
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