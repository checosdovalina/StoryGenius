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

  const handleSaveRotationInterval = () => {
    updateRotationMutation.mutate(rotationInterval);
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
    </div>
  );
}
