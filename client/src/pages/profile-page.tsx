import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User, KeyRound } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

type User = {
  id: string;
  name: string;
  email: string;
  username: string;
};

export default function ProfilePage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; password?: string; currentPassword?: string }) => {
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
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil",
        variant: "destructive",
      });
    },
  });

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
