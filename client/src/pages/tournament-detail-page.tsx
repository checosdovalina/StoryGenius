import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Tournament } from "@shared/schema";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Trophy, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

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

function PlayersTab({ tournament, canManage }: { tournament: Tournament; canManage?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Jugadores Registrados</span>
          {canManage && (
            <Button data-testid="button-add-player">
              Agregar Jugador
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Gestiona los jugadores registrados en este torneo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400" data-testid="text-no-players">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No hay jugadores registrados aún</p>
          <p className="text-sm">Los jugadores aparecerán aquí cuando se registren</p>
        </div>
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