import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Tournament, User } from "@shared/schema";
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Partidos</span>
          {canManage && (
            <Button data-testid="button-create-match">
              Crear Partido
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Visualiza y gestiona los partidos del torneo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400" data-testid="text-no-matches">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No hay partidos programados aún</p>
          <p className="text-sm">Los partidos aparecerán cuando se generen los brackets</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BracketsTab({ tournament, canManage }: { tournament: Tournament; canManage?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Brackets</span>
          {canManage && (
            <Button data-testid="button-generate-brackets">
              Generar Brackets
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Visualiza la estructura del torneo y los brackets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400" data-testid="text-no-brackets">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Los brackets no han sido generados aún</p>
          <p className="text-sm">Se generarán automáticamente cuando haya suficientes jugadores</p>
        </div>
      </CardContent>
    </Card>
  );
}