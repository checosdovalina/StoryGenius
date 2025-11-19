import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { InsertTournament, Club } from "@shared/schema";

interface CreateTournamentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTournamentModal({ open, onOpenChange }: CreateTournamentModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    sport: "",
    format: "",
    clubId: "",
    timezone: "America/Mexico_City",
    startDate: "",
    endDate: "",
    maxPlayers: "",
    registrationFee: "",
    tier: "",
    prizePool: "",
    description: ""
  });

  const { data: clubs, isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["/api/clubs"],
    enabled: open
  });

  const createTournamentMutation = useMutation({
    mutationFn: async (tournamentData: Omit<InsertTournament, 'organizerId'>) => {
      const res = await apiRequest("POST", "/api/tournaments", tournamentData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Torneo creado",
        description: "El torneo ha sido creado exitosamente."
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      sport: "",
      format: "",
      clubId: "",
      timezone: "America/Mexico_City",
      startDate: "",
      endDate: "",
      maxPlayers: "",
      registrationFee: "",
      tier: "",
      prizePool: "",
      description: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedClub = clubs?.find(c => c.id === formData.clubId);
    const tournamentData = {
      name: formData.name,
      sport: formData.sport as "padel" | "racquetball",
      format: formData.format as "elimination" | "round_robin" | "groups",
      status: "draft" as const,
      venue: selectedClub?.name || "",
      clubId: formData.clubId || undefined,
      timezone: formData.timezone,
      startDate: new Date(formData.startDate + 'T00:00:00'),
      endDate: new Date(formData.endDate + 'T23:59:59'),
      maxPlayers: parseInt(formData.maxPlayers),
      registrationFee: formData.registrationFee ? formData.registrationFee : "0",
      tier: formData.tier || undefined,
      prizePool: formData.prizePool || undefined,
      description: formData.description || null
    };

    createTournamentMutation.mutate(tournamentData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="create-tournament-modal">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Torneo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Torneo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
                data-testid="input-tournament-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sport">Deporte</Label>
              <Select value={formData.sport} onValueChange={(value) => handleInputChange("sport", value)} required>
                <SelectTrigger data-testid="select-tournament-sport">
                  <SelectValue placeholder="Seleccionar deporte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="racquetball">Raquetbol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                required
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha de Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
                required
                data-testid="input-end-date"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clubId">Sede/Club</Label>
              <Select value={formData.clubId} onValueChange={(value) => handleInputChange("clubId", value)} required>
                <SelectTrigger data-testid="select-club">
                  <SelectValue placeholder={clubsLoading ? "Cargando clubes..." : "Seleccionar club"} />
                </SelectTrigger>
                <SelectContent>
                  {clubs?.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Zona Horaria</Label>
              <Select value={formData.timezone} onValueChange={(value) => handleInputChange("timezone", value)} required>
                <SelectTrigger data-testid="select-timezone">
                  <SelectValue placeholder="Seleccionar zona horaria" />
                </SelectTrigger>
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
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="format">Formato del Torneo</Label>
              <Select value={formData.format} onValueChange={(value) => handleInputChange("format", value)} required>
                <SelectTrigger data-testid="select-tournament-format">
                  <SelectValue placeholder="Formato del torneo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elimination">Eliminación Directa</SelectItem>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                  <SelectItem value="groups">Fase de Grupos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPlayers">Máximo de Jugadores</Label>
              <Input
                id="maxPlayers"
                type="number"
                min="4"
                max="128"
                value={formData.maxPlayers}
                onChange={(e) => handleInputChange("maxPlayers", e.target.value)}
                required
                data-testid="input-max-players"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registrationFee">Cuota de Inscripción ($)</Label>
              <Input
                id="registrationFee"
                type="number"
                min="0"
                step="0.01"
                value={formData.registrationFee}
                onChange={(e) => handleInputChange("registrationFee", e.target.value)}
                data-testid="input-registration-fee"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier">Tier IRT (Opcional)</Label>
              <Select value={formData.tier} onValueChange={(value) => handleInputChange("tier", value)}>
                <SelectTrigger data-testid="select-tournament-tier">
                  <SelectValue placeholder="Seleccionar tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GS-1000">Grand Slam - 1000 Pts</SelectItem>
                  <SelectItem value="GS-900">Grand Slam - 900 Pts</SelectItem>
                  <SelectItem value="IRT-800">Tier 1 - 800 Pts</SelectItem>
                  <SelectItem value="IRT-700">Tier 1 - 700 Pts</SelectItem>
                  <SelectItem value="SAT-600">Satellite - 600 Pts</SelectItem>
                  <SelectItem value="SAT-500">Satellite - 500 Pts</SelectItem>
                  <SelectItem value="SAT-400">Satellite - 400 Pts</SelectItem>
                  <SelectItem value="SAT-350">Satellite - 350 Pts</SelectItem>
                  <SelectItem value="SAT-250">Satellite - 250 Pts</SelectItem>
                  <SelectItem value="SAT-150">Satellite - 150 Pts</SelectItem>
                  <SelectItem value="DOB-800">Doubles Pro - 800 Pts</SelectItem>
                  <SelectItem value="DOB-700">Doubles Pro - 700 Pts</SelectItem>
                  <SelectItem value="DOB-600">Doubles Pro - 600 Pts</SelectItem>
                  <SelectItem value="DOB-500">Doubles Pro - 500 Pts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prizePool">Prize Pool (Opcional)</Label>
            <Input
              id="prizePool"
              type="text"
              placeholder="e.g., $10,000 USD"
              value={formData.prizePool}
              onChange={(e) => handleInputChange("prizePool", e.target.value)}
              data-testid="input-prize-pool"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
              data-testid="textarea-description"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createTournamentMutation.isPending}
              data-testid="button-create"
            >
              {createTournamentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Torneo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
