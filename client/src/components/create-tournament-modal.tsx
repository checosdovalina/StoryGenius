import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { InsertTournament } from "@shared/schema";

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
    venue: "",
    startDate: "",
    endDate: "",
    maxPlayers: "",
    registrationFee: "",
    description: ""
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
      venue: "",
      startDate: "",
      endDate: "",
      maxPlayers: "",
      registrationFee: "",
      description: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const tournamentData = {
      name: formData.name,
      sport: formData.sport as "padel" | "racquetball",
      format: formData.format as "elimination" | "round_robin" | "groups",
      status: "draft" as const,
      venue: formData.venue,
      startDate: new Date(formData.startDate + 'T00:00:00'),
      endDate: new Date(formData.endDate + 'T23:59:59'),
      maxPlayers: parseInt(formData.maxPlayers),
      registrationFee: formData.registrationFee ? formData.registrationFee : "0",
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
                  <SelectItem value="padel">Pádel</SelectItem>
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

          <div className="space-y-2">
            <Label htmlFor="venue">Sede/Club</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => handleInputChange("venue", e.target.value)}
              required
              data-testid="input-venue"
            />
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
