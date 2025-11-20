import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import type { User } from "@shared/schema";
import { Loader2 } from "lucide-react";

const MATCH_CATEGORIES = [
  { value: "PRO_SINGLES_IRT", label: "PRO Singles IRT" },
  { value: "DOBLES_OPEN", label: "Dobles Open" },
  { value: "AMATEUR_A", label: "Amateur A" },
  { value: "AMATEUR_B", label: "Amateur B" },
  { value: "AMATEUR_C", label: "Amateur C" },
  { value: "PRINCIPIANTES", label: "Principiantes" },
  { value: "JUVENIL_18_VARONIL", label: "Juvenil 18 y menores (Varonil)" },
  { value: "JUVENIL_18_FEMENIL", label: "Juvenil 18 y menores (Femenil)" },
  { value: "DOBLES_AB", label: "Dobles AB" },
  { value: "DOBLES_BC", label: "Dobles BC" },
  { value: "MASTER_35", label: "Master 35+" },
  { value: "MASTER_55", label: "Master 55+" },
  { value: "DOBLES_MASTER_35", label: "Dobles Master 35+" },
];

const COUNTRIES = [
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "CA", name: "Canadá", flag: "🇨🇦" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "PE", name: "Perú", flag: "🇵🇪" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "PA", name: "Panamá", flag: "🇵🇦" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "DO", name: "República Dominicana", flag: "🇩🇴" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷" },
];

const userFormSchema = insertUserSchema.extend({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional().or(z.literal("")),
  photoUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  nationality: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormModalProps {
  user?: User | null;
  open: boolean;
  onClose: () => void;
}

export function UserFormModal({ user, open, onClose }: UserFormModalProps) {
  const { toast } = useToast();
  const isEditMode = !!user;

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: user ? {
      username: user.username,
      email: user.email,
      name: user.name,
      phone: user.phone || "",
      club: user.club || "",
      preferredSport: user.preferredSport || undefined,
      categories: user.categories || [],
      photoUrl: user.photoUrl || "",
      nationality: user.nationality || undefined,
      password: "",
    } : {
      username: "",
      email: "",
      name: "",
      phone: "",
      club: "",
      preferredSport: "racquetball",
      categories: [],
      photoUrl: "",
      nationality: undefined,
      password: "",
      role: "jugador",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente."
      });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const { password, ...updateData } = data;
      const payload = password ? { ...updateData, password } : updateData;
      const res = await apiRequest("PUT", `/api/users/${user!.id}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado exitosamente."
      });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: UserFormData) => {
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Usuario" : "Crear Usuario"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Actualiza la información del usuario" : "Completa los datos para crear un nuevo usuario"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Juan Pérez" data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="juanperez" data-testid="input-username" disabled={isEditMode} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email*</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="juan@ejemplo.com" data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+52 1234567890" data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEditMode ? "Nueva Contraseña (opcional)" : "Contraseña*"}</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="••••••••" data-testid="input-password" />
                  </FormControl>
                  {isEditMode && <FormDescription>Déjalo vacío para mantener la contraseña actual</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="club"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="GB Sport" data-testid="input-club" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nacionalidad</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-nationality">
                          <SelectValue placeholder="Selecciona país" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            <div className="flex items-center gap-2">
                              <span>{country.flag}</span>
                              <span>{country.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorías (máximo 3)</FormLabel>
                  <FormDescription>
                    Seleccionadas: {field.value?.length || 0}/3
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-3 border rounded-lg p-4 max-h-48 overflow-y-auto">
                    {MATCH_CATEGORIES.map((cat) => (
                      <div key={cat.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${cat.value}`}
                          checked={field.value?.includes(cat.value as any)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            if (checked) {
                              if (current.length >= 3) {
                                toast({
                                  title: "Límite alcanzado",
                                  description: "Solo puedes seleccionar hasta 3 categorías",
                                  variant: "destructive",
                                });
                                return;
                              }
                              field.onChange([...current, cat.value as any]);
                            } else {
                              field.onChange(current.filter((v) => v !== cat.value));
                            }
                          }}
                          data-testid={`checkbox-category-${cat.value}`}
                        />
                        <label
                          htmlFor={`category-${cat.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {cat.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de Foto</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://ejemplo.com/foto.jpg" data-testid="input-photo-url" />
                  </FormControl>
                  <FormDescription>URL de la foto del jugador</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-user">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Actualizar" : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
