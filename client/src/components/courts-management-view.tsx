import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Clock, Wrench, Calendar, Edit } from "lucide-react";
import type { Court, Club } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

const createCourtSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  sport: z.enum(["padel", "racquetball"], { required_error: "Selecciona un deporte" }),
  venue: z.string().min(1, "El lugar es requerido"),
  startTime: z.string().min(1, "La hora de inicio es requerida"),
  endTime: z.string().min(1, "La hora de cierre es requerida"),
  description: z.string().optional(),
  status: z.enum(["available", "maintenance", "blocked"]).default("available"),
  clubId: z.string().min(1, "Selecciona un club")
});

type CreateCourtForm = z.infer<typeof createCourtSchema>;

export function CourtsManagementView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  
  const isSuperAdmin = user?.role === "superadmin";

  const { data: courts = [], isLoading } = useQuery<Court[]>({
    queryKey: ["/api/courts"]
  });

  const { data: clubs = [], isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["/api/clubs"]
  });

  const form = useForm<CreateCourtForm>({
    resolver: zodResolver(createCourtSchema),
    defaultValues: {
      name: "",
      sport: undefined,
      venue: "",
      startTime: "06:00",
      endTime: "22:00",
      description: "",
      status: "available",
      clubId: ""
    }
  });

  const editForm = useForm<CreateCourtForm>({
    resolver: zodResolver(createCourtSchema),
    defaultValues: {
      name: "",
      sport: undefined,
      venue: "",
      startTime: "06:00",
      endTime: "22:00",
      description: "",
      status: "available",
      clubId: ""
    }
  });

  const createCourtMutation = useMutation({
    mutationFn: async (data: CreateCourtForm) => {
      const res = await apiRequest("POST", "/api/courts", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      setShowCreateModal(false);
      form.reset();
      toast({
        title: "Cancha creada",
        description: "La cancha se ha creado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear la cancha",
        variant: "destructive",
      });
    }
  });

  const updateCourtMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateCourtForm }) => {
      const res = await apiRequest("PUT", `/api/courts/${id}`, data);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      setShowEditModal(false);
      setEditingCourt(null);
      editForm.reset();
      toast({
        title: "Cancha actualizada",
        description: "La cancha se ha actualizado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la cancha",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CreateCourtForm) => {
    createCourtMutation.mutate(data);
  };

  const onEditSubmit = (data: CreateCourtForm) => {
    if (editingCourt) {
      updateCourtMutation.mutate({ id: editingCourt.id, data });
    }
  };

  const handleEditCourt = (court: Court) => {
    setEditingCourt(court);
    editForm.reset({
      name: court.name,
      sport: court.sport as "padel" | "racquetball",
      venue: court.venue,
      startTime: court.startTime,
      endTime: court.endTime,
      description: court.description || "",
      status: court.status as "available" | "maintenance" | "blocked",
      clubId: court.clubId
    });
    setShowEditModal(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "available": return "default";
      case "maintenance": return "secondary";
      case "blocked": return "destructive";
      default: return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available": return "Disponible";
      case "maintenance": return "Mantenimiento";
      case "blocked": return "Bloqueada";
      default: return status;
    }
  };

  if (isLoading || clubsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Gestión de Canchas</h3>
          <p className="text-muted-foreground">Administra canchas, horarios y disponibilidad</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-new-court">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cancha
        </Button>
      </div>

      {courts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No hay canchas registradas</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear tu primera cancha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courts.map((court) => (
            <Card key={court.id} data-testid={`court-card-${court.id}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-card-foreground" data-testid={`court-name-${court.id}`}>
                      {court.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {court.sport.charAt(0).toUpperCase() + court.sport.slice(1)}
                      {court.description && ` - ${court.description}`}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(court.status)} data-testid={`court-status-${court.id}`}>
                    {getStatusLabel(court.status)}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span data-testid={`court-hours-${court.id}`}>
                      {court.startTime} - {court.endTime}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Wrench className="w-4 h-4 mr-2" />
                    <span>
                      {court.maintenanceUntil ? 
                        `Mantenimiento hasta ${new Date(court.maintenanceUntil).toLocaleDateString('es-ES')}` :
                        "Sin mantenimiento programado"
                      }
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>0 partidos programados hoy</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="secondary" className="flex-1" data-testid={`button-court-schedule-${court.id}`}>
                    Horarios
                  </Button>
                  {isSuperAdmin && (
                    <Button 
                      className="flex-1" 
                      onClick={() => handleEditCourt(court)}
                      data-testid={`button-edit-court-${court.id}`}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nueva Cancha</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Cancha</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Cancha 1, Cancha Principal" data-testid="input-court-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deporte</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-court-sport">
                          <SelectValue placeholder="Selecciona un deporte" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="racquetball">Racquetball</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clubId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-court-club">
                          <SelectValue placeholder="Selecciona un club" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.id}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lugar/Ubicación</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Complejo Deportivo Central" data-testid="input-court-venue" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Apertura</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" data-testid="input-court-start-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Cierre</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" data-testid="input-court-end-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Descripción adicional de la cancha..."
                        data-testid="textarea-court-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  data-testid="button-cancel-court"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createCourtMutation.isPending}
                  data-testid="button-create-court"
                >
                  {createCourtMutation.isPending ? "Creando..." : "Crear Cancha"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Court Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Cancha</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Cancha</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Cancha 1, Cancha Principal" data-testid="input-edit-court-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="sport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deporte</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-court-sport">
                          <SelectValue placeholder="Selecciona un deporte" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="racquetball">Racquetball</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="clubId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-court-club">
                          <SelectValue placeholder="Selecciona un club" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.id}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lugar/Ubicación</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Complejo Deportivo Central" data-testid="input-edit-court-venue" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Apertura</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" data-testid="input-edit-court-start-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Cierre</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" data-testid="input-edit-court-end-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-court-status">
                          <SelectValue placeholder="Selecciona el estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Disponible</SelectItem>
                        <SelectItem value="maintenance">Mantenimiento</SelectItem>
                        <SelectItem value="blocked">Bloqueada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Descripción adicional de la cancha..."
                        data-testid="textarea-edit-court-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCourt(null);
                  }}
                  data-testid="button-cancel-edit-court"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateCourtMutation.isPending}
                  data-testid="button-update-court"
                >
                  {updateCourtMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
