import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tournament } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
import { Trash2 } from "lucide-react";
import { SponsorsManagement } from "./sponsors-management";

interface TournamentConfigurationTabProps {
  tournament: Tournament;
}

export function TournamentConfigurationTab({ tournament }: TournamentConfigurationTabProps) {
  const { toast } = useToast();
  const [rotationInterval, setRotationInterval] = useState<number>(
    (tournament.matchRotationInterval || 40000) / 1000
  );

  // Update rotation interval mutation
  const updateRotationMutation = useMutation({
    mutationFn: async (intervalSeconds: number) => {
      return apiRequest("PATCH", `/api/tournaments/${tournament.id}`, {
        matchRotationInterval: intervalSeconds * 1000,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tournaments/${tournament.id}`],
      });
      toast({
        title: "Intervalo actualizado",
        description: `El intervalo de rotación es ahora ${rotationInterval} segundos`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el intervalo de rotación",
      });
    },
  });

  // Reset tournament mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tournaments/${tournament.id}/reset`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tournaments/${tournament.id}`],
      });
      toast({
        title: "Torneo reiniciado",
        description: `Se eliminaron ${data.playersRemoved} jugadores y ${data.matchesRemoved} partidos. Los jugadores con rol en el torneo fueron preservados.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo reiniciar el torneo",
      });
    },
  });

  const handleSaveRotationInterval = () => {
    updateRotationMutation.mutate(rotationInterval);
  };

  const handleResetTournament = () => {
    resetMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Rotation Interval Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Rotación de Partidos</CardTitle>
          <CardDescription>
            Ajusta el tiempo que se muestra cada partido en el display público
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="rotation-interval" className="text-base font-medium">
                Intervalo de Rotación: {rotationInterval} segundos
              </Label>
              <p className="text-sm text-muted-foreground mt-2">
                Menor tiempo = rotación más rápida entre partidos
              </p>
            </div>

            <div className="space-y-4">
              <Slider
                id="rotation-interval"
                min={5}
                max={120}
                step={1}
                value={[rotationInterval]}
                onValueChange={(value) => setRotationInterval(value[0])}
                className="w-full"
                data-testid="slider-rotation-interval"
              />

              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={rotationInterval}
                  onChange={(e) => setRotationInterval(parseInt(e.target.value) || 5)}
                  className="w-24"
                  data-testid="input-rotation-interval"
                />
                <span className="text-sm text-muted-foreground">segundos</span>
              </div>
            </div>

            <Button
              onClick={handleSaveRotationInterval}
              disabled={updateRotationMutation.isPending}
              data-testid="button-save-rotation-interval"
              className="min-h-[44px]"
            >
              {updateRotationMutation.isPending ? "Guardando..." : "Guardar Intervalo"}
            </Button>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                ℹ️ <strong>Información:</strong> El intervalo se aplica a todos los displays públicos del torneo.
                Los cambios toman efecto inmediatamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sponsors Management */}
      <SponsorsManagement tournamentId={tournament.id} />

      {/* Tournament Reset */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Reiniciar Torneo</CardTitle>
          <CardDescription>
            Elimina todos los jugadores y partidos del torneo. Los jugadores con roles asignados serán preservados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-900 dark:text-red-200">
              ⚠️ <strong>Advertencia:</strong> Esta acción es irreversible. Se eliminarán todos los jugadores registrados (excepto los con roles) y todos los partidos del torneo.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="min-h-[44px]"
                data-testid="button-reset-tournament"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Reiniciar Torneo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará todos los jugadores registrados (excepto aquellos con roles en el torneo) y todos los partidos. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetTournament}
                  disabled={resetMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {resetMutation.isPending ? "Reiniciando..." : "Reiniciar Torneo"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
