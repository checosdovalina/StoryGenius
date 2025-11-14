import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, Shield, Users, Loader2 } from "lucide-react";
import type { Tournament, User } from "@shared/schema";

interface TournamentRole {
  id: string;
  tournamentId: string;
  userId: string;
  role: string;
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
  };
}

interface TournamentRolesTabProps {
  tournament: Tournament;
}

export function TournamentRolesTab({ tournament }: TournamentRolesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Check if current user is superadmin
  const isSuperAdmin = user?.role === "superadmin";

  // Fetch tournament roles
  const { data: tournamentRoles = [], isLoading: rolesLoading } = useQuery<TournamentRole[]>({
    queryKey: [`/api/tournaments/${tournament.id}/roles`],
    enabled: !!tournament.id,
  });

  // Fetch all users for role assignment (both SuperAdmin and Tournament Admin need this)
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: assignDialogOpen,
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournament.id}/roles`, {
        userId,
        role,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to assign role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament.id}/roles`] });
      setAssignDialogOpen(false);
      setSelectedUserId("");
      setSelectedRole("");
      toast({
        title: "Rol asignado",
        description: "El rol ha sido asignado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo asignar el rol.",
        variant: "destructive",
      });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("DELETE", `/api/tournaments/${tournament.id}/roles`, {
        userId,
        role,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to remove role");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament.id}/roles`] });
      toast({
        title: "Rol eliminado",
        description: "El rol ha sido eliminado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el rol.",
        variant: "destructive",
      });
    },
  });

  const handleAssignRole = () => {
    if (!selectedUserId || !selectedRole) {
      toast({
        title: "Error",
        description: "Por favor selecciona un usuario y un rol.",
        variant: "destructive",
      });
      return;
    }
    assignRoleMutation.mutate({ userId: selectedUserId, role: selectedRole });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "tournament_admin":
        return "default";
      case "organizador":
        return "secondary";
      case "arbitro":
        return "outline";
      case "escrutador":
        return "outline";
      case "jugador":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "tournament_admin":
        return "Administrador del Torneo";
      case "organizador":
        return "Organizador";
      case "arbitro":
        return "Árbitro";
      case "escrutador":
        return "Escrutador";
      case "jugador":
        return "Jugador";
      default:
        return role;
    }
  };

  // Available roles based on user permissions
  const getAvailableRoles = () => {
    if (isSuperAdmin) {
      // SuperAdmin can assign all roles except superadmin
      return [
        { value: "tournament_admin", label: "Administrador del Torneo" },
        { value: "organizador", label: "Organizador" },
        { value: "arbitro", label: "Árbitro" },
        { value: "escrutador", label: "Escrutador" },
        { value: "jugador", label: "Jugador" },
      ];
    }
    // Tournament admin can assign all roles except superadmin and tournament_admin
    return [
      { value: "organizador", label: "Organizador" },
      { value: "arbitro", label: "Árbitro" },
      { value: "escrutador", label: "Escrutador" },
      { value: "jugador", label: "Jugador" },
    ];
  };

  // Filter users that don't already have the selected role
  const getAvailableUsers = () => {
    if (!selectedRole) return allUsers;
    const usersWithRole = tournamentRoles
      .filter((tr) => tr.role === selectedRole)
      .map((tr) => tr.userId);
    return allUsers.filter((u) => !usersWithRole.includes(u.id));
  };

  if (rolesLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando roles...</p>
        </CardContent>
      </Card>
    );
  }

  // Group roles by role type
  const groupedRoles = tournamentRoles.reduce((acc, tr) => {
    if (!acc[tr.role]) {
      acc[tr.role] = [];
    }
    acc[tr.role].push(tr);
    return acc;
  }, {} as Record<string, TournamentRole[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gestión de Roles</h3>
          <p className="text-sm text-muted-foreground">
            Asigna y gestiona roles de usuarios en este torneo
          </p>
        </div>
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-assign-role">
              <UserPlus className="mr-2 h-4 w-4" />
              Asignar Rol
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Rol en Torneo</DialogTitle>
              <DialogDescription>
                Selecciona un usuario y un rol para asignarlo a este torneo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={selectedRole}
                  onValueChange={setSelectedRole}
                  data-testid="select-role"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRoles().map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Usuario</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  disabled={!selectedRole}
                  data-testid="select-user"
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        selectedRole
                          ? "Selecciona un usuario"
                          : "Primero selecciona un rol"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableUsers().map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setAssignDialogOpen(false)}
                  disabled={assignRoleMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAssignRole}
                  disabled={assignRoleMutation.isPending || !selectedUserId || !selectedRole}
                  data-testid="button-confirm-assign"
                >
                  {assignRoleMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Asignando...
                    </>
                  ) : (
                    "Asignar"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(groupedRoles).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No hay roles asignados en este torneo
            </p>
            <Button onClick={() => setAssignDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Asignar primer rol
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {Object.entries(groupedRoles).map(([role, users]) => (
            <Card key={role}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {getRoleLabel(role)}
                  <Badge variant={getRoleBadgeVariant(role)}>{users.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Usuarios con rol de {getRoleLabel(role).toLowerCase()} en este torneo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map((tr) => (
                    <div
                      key={`${tr.userId}-${tr.role}`}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      data-testid={`role-item-${tr.userId}-${tr.role}`}
                    >
                      <div>
                        <p className="font-medium">{tr.user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tr.user.username} • {tr.user.email}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-remove-role-${tr.userId}-${tr.role}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que deseas eliminar el rol de{" "}
                              {getRoleLabel(role).toLowerCase()} para {tr.user.name}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                removeRoleMutation.mutate({
                                  userId: tr.userId,
                                  role: tr.role,
                                })
                              }
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
