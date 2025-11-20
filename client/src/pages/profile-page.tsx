import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User, KeyRound, Camera, Globe } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

type User = {
  id: string;
  name: string;
  email: string;
  username: string;
  photoUrl?: string | null;
  nationality?: string | null;
  categories?: string[] | null;
};

export default function ProfilePage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [nationality, setNationality] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Inicializar selectedCategories con las categorías del usuario cuando se carguen
  useEffect(() => {
    if (user?.categories) {
      setSelectedCategories(user.categories);
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { 
      email?: string; 
      password?: string; 
      currentPassword?: string;
      photoUrl?: string | null;
      nationality?: string | null;
      categories?: string[] | null;
    }) => {
      return await apiRequest("PATCH", "/api/user/profile", data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Perfil actualizado",
        description: data.message || "Tu perfil ha sido actualizado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setEmail("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPhotoUrl("");
      setNationality("");
      setSelectedCategories([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil",
        variant: "destructive",
      });
    },
  });

  const handleUpdateProfileInfo = () => {
    const updates: any = {};
    
    if (photoUrl) updates.photoUrl = photoUrl;
    if (nationality) updates.nationality = nationality;
    if (selectedCategories.length > 0) updates.categories = selectedCategories;

    if (Object.keys(updates).length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un campo para actualizar",
        variant: "destructive",
      });
      return;
    }

    if (selectedCategories.length > 3) {
      toast({
        title: "Error",
        description: "Solo puedes seleccionar hasta 3 categorías",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate(updates);
  };

  const handleToggleCategory = (categoryValue: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryValue)) {
        return prev.filter((c) => c !== categoryValue);
      } else {
        if (prev.length >= 3) {
          toast({
            title: "Límite alcanzado",
            description: "Solo puedes seleccionar hasta 3 categorías",
            variant: "destructive",
          });
          return prev;
        }
        return [...prev, categoryValue];
      }
    });
  };

  const handleUpdateEmail = () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Ingresa un nuevo email",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate({ email });
  };

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Completa todos los campos de contraseña",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate({ 
      password: newPassword, 
      currentPassword 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isTempEmail = user?.email?.endsWith("@temp.local");

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground">Administra tu información personal y credenciales</p>
      </div>

      {isTempEmail && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <AlertDescription className="text-yellow-800 dark:text-yellow-300">
            ⚠️ Tu cuenta usa un email temporal. Te recomendamos actualizar tu email y contraseña para mayor seguridad.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información Personal
          </CardTitle>
          <CardDescription>
            Tu información de cuenta actual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.photoUrl || undefined} alt={user?.name} />
              <AvatarFallback className="text-lg">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-sm text-muted-foreground">@{user?.username}</p>
              {user?.nationality && (
                <p className="text-sm mt-1">
                  {COUNTRIES.find(c => c.code === user.nationality)?.flag} {COUNTRIES.find(c => c.code === user.nationality)?.name}
                </p>
              )}
              {user?.categories && user.categories.length > 0 && (
                <div className="text-sm mt-1">
                  <span className="font-medium">Categorías:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user.categories.map((cat) => (
                      <span key={cat} className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs">
                        {MATCH_CATEGORIES.find(c => c.value === cat)?.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={user?.name || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Usuario</Label>
            <Input value={user?.username || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email Actual</Label>
            <Input value={user?.email || ""} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Actualizar Foto y Datos
          </CardTitle>
          <CardDescription>
            Actualiza tu foto de perfil, nacionalidad y categoría
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="photo-url">URL de Foto</Label>
            <Input
              id="photo-url"
              type="url"
              placeholder="https://ejemplo.com/foto.jpg"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              data-testid="input-photo-url"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nacionalidad</Label>
            <Select value={nationality} onValueChange={setNationality}>
              <SelectTrigger id="nationality" data-testid="select-nationality">
                <SelectValue placeholder="Selecciona tu país" />
              </SelectTrigger>
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
          </div>
          <div className="space-y-2">
            <Label>Categorías (máximo 3)</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Seleccionadas: {selectedCategories.length}/3
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-lg p-4 max-h-64 overflow-y-auto">
              {MATCH_CATEGORIES.map((cat) => (
                <div key={cat.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${cat.value}`}
                    checked={selectedCategories.includes(cat.value)}
                    onCheckedChange={() => handleToggleCategory(cat.value)}
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
          </div>
          <Button 
            onClick={handleUpdateProfileInfo}
            disabled={updateProfileMutation.isPending}
            data-testid="button-update-profile-info"
          >
            {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Globe className="h-4 w-4 mr-2" />
            Actualizar Información
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Cambiar Email
          </CardTitle>
          <CardDescription>
            Actualiza tu dirección de correo electrónico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-email">Nuevo Email</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="nuevo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-new-email"
            />
          </div>
          <Button 
            onClick={handleUpdateEmail}
            disabled={updateProfileMutation.isPending}
            data-testid="button-update-email"
          >
            {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Actualizar Email
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>
            Actualiza tu contraseña de acceso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Contraseña Actual</Label>
            <Input
              id="current-password"
              type="password"
              placeholder="Tu contraseña actual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              data-testid="input-current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nueva Contraseña</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="input-new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="input-confirm-password"
            />
          </div>
          <Button 
            onClick={handleUpdatePassword}
            disabled={updateProfileMutation.isPending}
            data-testid="button-update-password"
          >
            {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <KeyRound className="h-4 w-4 mr-2" />
            Actualizar Contraseña
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
