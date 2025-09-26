import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Tournament, User, Match } from "@shared/schema";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Users, Trophy, ArrowLeft, UserPlus, X } from "lucide-react";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ViewType } from "@/pages/home-page";

// =======================
// 1️⃣ Página principal
// =======================
export default function TournamentDetailPage() {
  const { id: tournamentId } = useParams();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<ViewType>("tournaments");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // =======================
  // 2️⃣ Obtener torneo
  // =======================
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
    <div className="flex h-screen bg-background">
      {/* =======================
          3️⃣ Sidebar
      ======================= */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* =======================
          4️⃣ Contenido principal
      ======================= */}
      <main className="flex-1 overflow-auto">
        <Header 
          currentView="tournaments"
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <div className="p-6">
          {/* =======================
              5️⃣ Header con info del torneo
          ======================= */}
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

          {/* =======================
              6️⃣ Tabs principales
          ======================= */}
          <Tabs defaultValue="players" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
              <TabsTrigger value="players" data-testid="tab-players">Jugadores</TabsTrigger>
              <TabsTrigger value="matches" data-testid="tab-matches">Partidos</TabsTrigger>
              <TabsTrigger value="brackets" data-testid="tab-brackets">Brackets</TabsTrigger>
            </TabsList>

            {/* =======================
                6.1️⃣ Tab Jugadores
            ======================= */}
            <TabsContent value="players" className="mt-6">
              <PlayersTab tournament={tournament} canManage={canManage} />
            </TabsContent>

            {/* =======================
                6.2️⃣ Tab Partidos
            ======================= */}
            <TabsContent value="matches" className="mt-6">
              <MatchesTab tournament={tournament} canManage={canManage} />
            </TabsContent>

            {/* =======================
                6.3️⃣ Tab Brackets
            ======================= */}
            <TabsContent value="brackets" className="mt-6">
              <BracketsTab tournament={tournament} canManage={canManage} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

// =======================
// 7️⃣ Resto de tabs y formularios (PlayersTab, MatchesTab, BracketsTab)
// =======================
// --- Aquí incluirías exactamente todo el código que ya tenías para:
//      PlayersTab
//      MatchesTab
//      BracketsTab
//      Mutations, Forms, Validations, etc.
//      Todo igual, sin duplicaciones ni tabs extra.
// =======================

