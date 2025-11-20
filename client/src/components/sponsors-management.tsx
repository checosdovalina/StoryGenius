import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

interface SponsorsManagementProps {
  tournamentId: string;
}

export function SponsorsManagement({ tournamentId }: SponsorsManagementProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    websiteUrl: "",
    displayOrder: 0,
  });

  // Fetch sponsors
  const { data: sponsors = [], isLoading } = useQuery<Sponsor[]>({
    queryKey: ["/api/tournaments", tournamentId, "sponsors"],
  });

  // Create/Update sponsor mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingSponsor) {
        return apiRequest("PATCH", `/api/sponsors/${editingSponsor.id}`, data);
      } else {
        return apiRequest("POST", `/api/tournaments/${tournamentId}/sponsors`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tournaments", tournamentId, "sponsors"],
      });
      toast({
        title: editingSponsor ? "Patrocinador actualizado" : "Patrocinador creado",
        description: editingSponsor
          ? "El patrocinador ha sido actualizado correctamente"
          : "El patrocinador ha sido agregado correctamente",
      });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el patrocinador",
      });
    },
  });

  // Delete sponsor mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/sponsors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tournaments", tournamentId, "sponsors"],
      });
      toast({
        title: "Patrocinador eliminado",
        description: "El patrocinador ha sido eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el patrocinador",
      });
    },
  });

  const handleOpenDialog = (sponsor?: Sponsor) => {
    if (sponsor) {
      setEditingSponsor(sponsor);
      setFormData({
        name: sponsor.name,
        logoUrl: sponsor.logoUrl,
        websiteUrl: sponsor.websiteUrl || "",
        displayOrder: sponsor.displayOrder,
      });
    } else {
      setEditingSponsor(null);
      setFormData({
        name: "",
        logoUrl: "",
        websiteUrl: "",
        displayOrder: sponsors.length,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSponsor(null);
    setFormData({
      name: "",
      logoUrl: "",
      websiteUrl: "",
      displayOrder: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este patrocinador?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando patrocinadores...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Patrocinadores del Torneo</CardTitle>
        <Button onClick={() => handleOpenDialog()} size="sm" data-testid="button-add-sponsor">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Patrocinador
        </Button>
      </CardHeader>
      <CardContent>
        {sponsors.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No hay patrocinadores agregados para este torneo
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Sitio Web</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sponsors.map((sponsor) => (
                <TableRow key={sponsor.id}>
                  <TableCell>
                    {sponsor.logoUrl ? (
                      <img
                        src={sponsor.logoUrl}
                        alt={sponsor.name}
                        className="h-8 w-auto object-contain"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin logo</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{sponsor.name}</TableCell>
                  <TableCell>
                    {sponsor.websiteUrl ? (
                      <a
                        href={sponsor.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Visitar
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{sponsor.displayOrder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(sponsor)}
                        data-testid={`button-edit-sponsor-${sponsor.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sponsor.id)}
                        data-testid={`button-delete-sponsor-${sponsor.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSponsor ? "Editar Patrocinador" : "Agregar Patrocinador"}
              </DialogTitle>
              <DialogDescription>
                {editingSponsor
                  ? "Modifica los datos del patrocinador"
                  : "Ingresa los datos del nuevo patrocinador"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nombre del patrocinador"
                    required
                    data-testid="input-sponsor-name"
                  />
                </div>
                <div>
                  <Label htmlFor="logoUrl">URL del Logo *</Label>
                  <Input
                    id="logoUrl"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://ejemplo.com/logo.png"
                    type="url"
                    required
                    data-testid="input-sponsor-logoUrl"
                  />
                </div>
                <div>
                  <Label htmlFor="websiteUrl">Sitio Web (opcional)</Label>
                  <Input
                    id="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="https://ejemplo.com"
                    type="url"
                    data-testid="input-sponsor-websiteUrl"
                  />
                </div>
                <div>
                  <Label htmlFor="displayOrder">Orden de visualización</Label>
                  <Input
                    id="displayOrder"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                    type="number"
                    data-testid="input-sponsor-displayOrder"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Menor número = aparece primero
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  data-testid="button-save-sponsor"
                >
                  {saveMutation.isPending
                    ? "Guardando..."
                    : editingSponsor
                    ? "Actualizar"
                    : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
