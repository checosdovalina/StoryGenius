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
import { Plus, Clock, Wrench, Calendar, Edit, Building, MapPin, Phone, Mail, Globe } from "lucide-react";
import type { Club, Court } from "@shared/schema";

const createClubSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().refine(val => !val || z.string().email().safeParse(val).success, "Email inválido").optional(),
  website: z.string().refine(val => !val || z.string().url().safeParse(val).success, "URL inválida").optional()
});

const createCourtSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  sport: z.enum(["padel", "racquetball"], { required_error: "Selecciona un deporte" }),
  venue: z.string().min(1, "El lugar es requerido"),
  startTime: z.string().min(1, "La hora de inicio es requerida"),
  endTime: z.string().min(1, "La hora de cierre es requerida"),
  description: z.string().optional(),
  status: z.enum(["available", "maintenance", "blocked"]).default("available"),
  clubId: z.string().min(1, "ID del club es requerido")
});

type CreateClubForm = z.infer<typeof createClubSchema>;
type CreateCourtForm = z.infer<typeof createCourtSchema>;

export function ClubView() {
  const { toast } = useToast();
  const [showCreateClubModal, setShowCreateClubModal] = useState(false);
  const [showEditClubModal, setShowEditClubModal] = useState(false);
  const [showCreateCourtModal, setShowCreateCourtModal] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);

  const { data: clubs = [], isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["/api/clubs"]
  });

  const { data: courts = [], isLoading: courtsLoading } = useQuery<Court[]>({
    queryKey: ["/api/courts"]
  });

  const clubForm = useForm<CreateClubForm>({
    resolver: zodResolver(createClubSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      website: ""
    }
  });

  const courtForm = useForm<CreateCourtForm>({
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

  const createClubMutation = useMutation({
    mutationFn: async (data: CreateClubForm) => {
      const res = await apiRequest("POST", "/api/clubs", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      setShowCreateClubModal(false);
      clubForm.reset();
      toast({
        title: "Club creado",
        description: "El club se ha creado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear el club",
        variant: "destructive",
      });
    }
  });

  const updateClubMutation = useMutation({
    mutationFn: async (data: CreateClubForm & { id: string }) => {
      const res = await apiRequest("PATCH", `/api/clubs/${data.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      setShowEditClubModal(false);
      setEditingClub(null);
      clubForm.reset();
      toast({
        title: "Club actualizado",
        description: "El club se ha actualizado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el club",
        variant: "destructive",
      });
    }
  });

  const createCourtMutation = useMutation({
    mutationFn: async (data: CreateCourtForm) => {
      const res = await apiRequest("POST", "/api/courts", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      setShowCreateCourtModal(false);
      courtForm.reset();
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

  const handleEditClub = (club: Club) => {
    setEditingClub(club);
    clubForm.reset({
      name: club.name,
      description: club.description || "",
      address: club.address || "",
      phone: club.phone || "",
      email: club.email || "",
      website: club.website || ""
    });
    setShowEditClubModal(true);
  };

  const handleCreateCourt = (clubId: string) => {
    courtForm.setValue("clubId", clubId);
    setShowCreateCourtModal(true);
  };

  const getCourtsByClub = (clubId: string) => {
    return courts.filter(court => court.clubId === clubId);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      available: { label: "Disponible", variant: "default" as const },
      maintenance: { label: "Mantenimiento", variant: "secondary" as const },
      blocked: { label: "Bloqueada", variant: "destructive" as const }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.available;
    return (
      <Badge variant={config.variant} data-testid={`badge-court-status-${status}`}>
        {config.label}
      </Badge>
    );
  };

  if (clubsLoading || courtsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground" data-testid="title-club-management">
          Gestión de Clubes
        </h1>
        <Button 
          onClick={() => setShowCreateClubModal(true)}
          className="bg-primary hover:bg-primary/90"
          data-testid="button-create-club"
        >
          <Plus className="mr-2 h-4 w-4" />
          Crear Club
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {clubs.map((club) => {
          const clubCourts = getCourtsByClub(club.id);
          
          return (
            <Card key={club.id} className="bg-card border border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2" data-testid={`text-club-name-${club.id}`}>
                    <Building className="h-5 w-5" />
                    {club.name}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClub(club)}
                    data-testid={`button-edit-club-${club.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {club.description && (
                  <p className="text-sm text-muted-foreground" data-testid={`text-club-description-${club.id}`}>
                    {club.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  {club.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span data-testid={`text-club-address-${club.id}`}>{club.address}</span>
                    </div>
                  )}
                  {club.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span data-testid={`text-club-phone-${club.id}`}>{club.phone}</span>
                    </div>
                  )}
                  {club.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span data-testid={`text-club-email-${club.id}`}>{club.email}</span>
                    </div>
                  )}
                  {club.website && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <a 
                        href={club.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline"
                        data-testid={`link-club-website-${club.id}`}
                      >
                        {club.website}
                      </a>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium" data-testid={`text-courts-title-${club.id}`}>
                      Canchas ({clubCourts.length})
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateCourt(club.id)}
                      data-testid={`button-add-court-${club.id}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {clubCourts.map((court) => (
                      <div 
                        key={court.id}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                        data-testid={`card-court-${court.id}`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm" data-testid={`text-court-name-${court.id}`}>
                            {court.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span data-testid={`text-court-sport-${court.id}`}>{court.sport}</span> • 
                            <span data-testid={`text-court-hours-${court.id}`}> {court.startTime} - {court.endTime}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(court.status)}
                        </div>
                      </div>
                    ))}
                    
                    {clubCourts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay canchas registradas
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {clubs.length === 0 && (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No hay clubes registrados</h3>
          <p className="text-muted-foreground mb-4">
            Comienza creando tu primer club para gestionar las canchas y torneos.
          </p>
          <Button 
            onClick={() => setShowCreateClubModal(true)}
            data-testid="button-create-first-club"
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear primer club
          </Button>
        </div>
      )}

      {/* Create Club Modal */}
      <Dialog open={showCreateClubModal} onOpenChange={setShowCreateClubModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle data-testid="title-create-club-modal">Crear Nuevo Club</DialogTitle>
          </DialogHeader>
          <Form {...clubForm}>
            <form onSubmit={clubForm.handleSubmit((data) => createClubMutation.mutate(data))} className="space-y-4">
              <FormField
                control={clubForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Club</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej. Club Deportivo Raqueta" data-testid="input-club-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={clubForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descripción del club" data-testid="input-club-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={clubForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección (Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Dirección completa" data-testid="input-club-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={clubForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (Opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Teléfono" data-testid="input-club-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={clubForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@club.com" data-testid="input-club-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={clubForm.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sitio Web (Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://www.club.com" data-testid="input-club-website" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateClubModal(false)}
                  data-testid="button-cancel-club"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createClubMutation.isPending}
                  data-testid="button-submit-club"
                >
                  {createClubMutation.isPending ? "Creando..." : "Crear Club"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Club Modal */}
      <Dialog open={showEditClubModal} onOpenChange={setShowEditClubModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle data-testid="title-edit-club-modal">Editar Club</DialogTitle>
          </DialogHeader>
          <Form {...clubForm}>
            <form onSubmit={clubForm.handleSubmit((data) => {
              if (editingClub) {
                updateClubMutation.mutate({ ...data, id: editingClub.id });
              }
            })} className="space-y-4">
              <FormField
                control={clubForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Club</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej. Club Deportivo Raqueta" data-testid="input-edit-club-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={clubForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descripción del club" data-testid="input-edit-club-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={clubForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección (Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Dirección completa" data-testid="input-edit-club-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={clubForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (Opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Teléfono" data-testid="input-edit-club-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={clubForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@club.com" data-testid="input-edit-club-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={clubForm.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sitio Web (Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://www.club.com" data-testid="input-edit-club-website" />
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
                    setShowEditClubModal(false);
                    setEditingClub(null);
                  }}
                  data-testid="button-cancel-edit-club"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateClubMutation.isPending}
                  data-testid="button-submit-edit-club"
                >
                  {updateClubMutation.isPending ? "Actualizando..." : "Actualizar Club"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Court Modal */}
      <Dialog open={showCreateCourtModal} onOpenChange={setShowCreateCourtModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle data-testid="title-create-court-modal">Crear Nueva Cancha</DialogTitle>
          </DialogHeader>
          <Form {...courtForm}>
            <form onSubmit={courtForm.handleSubmit((data) => createCourtMutation.mutate(data))} className="space-y-4">
              <FormField
                control={courtForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Cancha</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej. Cancha Central" data-testid="input-court-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={courtForm.control}
                name="sport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deporte</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-court-sport">
                          <SelectValue placeholder="Selecciona un deporte" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="padel">Padel</SelectItem>
                        <SelectItem value="racquetball">Racquetball</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={courtForm.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lugar/Ubicación</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej. Planta Alta, Sector A" data-testid="input-court-venue" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={courtForm.control}
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
                  control={courtForm.control}
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
                control={courtForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descripción adicional" data-testid="input-court-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={courtForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-court-status">
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateCourtModal(false)}
                  data-testid="button-cancel-court"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCourtMutation.isPending}
                  data-testid="button-submit-court"
                >
                  {createCourtMutation.isPending ? "Creando..." : "Crear Cancha"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}