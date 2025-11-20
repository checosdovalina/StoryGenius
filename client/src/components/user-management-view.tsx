import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Edit, Trash2, Shield, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserFormModal } from "@/components/user-form-modal";
import type { User } from "@shared/schema";

type UserWithTournamentRoles = User & {
  tournamentRoles: Array<{
    tournamentId: string;
    tournamentName: string;
    role: string;
  }>;
};

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

const MATCH_CATEGORIES_LABELS: Record<string, string> = {
  "PRO_SINGLES_IRT": "PRO Singles IRT",
  "DOBLES_OPEN": "Dobles Open",
  "AMATEUR_A": "Amateur A",
  "AMATEUR_B": "Amateur B",
  "AMATEUR_C": "Amateur C",
  "PRINCIPIANTES": "Principiantes",
  "JUVENIL_18_VARONIL": "Juvenil 18 (V)",
  "JUVENIL_18_FEMENIL": "Juvenil 18 (F)",
  "DOBLES_AB": "Dobles AB",
  "DOBLES_BC": "Dobles BC",
  "MASTER_35": "Master 35+",
  "MASTER_55": "Master 55+",
  "DOBLES_MASTER_35": "Dobles M35+",
};

export function UserManagementView() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormModalOpen, setUserFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery<UserWithTournamentRoles[]>({
    queryKey: ["/api/users"]
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PUT", `/api/users/${userId}/role`, { role });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Rol actualizado",
        description: "El rol del usuario ha sido actualizado exitosamente."
      });
      setEditingUserId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado exitosamente."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    // Defensive check: verify user can still be edited
    const user = users.find(u => u.id === userId);
    if (!user || !canEditUser(user)) {
      toast({
        title: "Error",
        description: "No tienes permisos para editar este usuario",
        variant: "destructive"
      });
      setEditingUserId(null);
      return;
    }
    
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleDeleteUser = (userId: string) => {
    // Defensive check: verify user can still be deleted
    const user = users.find(u => u.id === userId);
    if (!user || !canDeleteUser(user)) {
      toast({
        title: "Error",
        description: "No tienes permisos para eliminar este usuario",
        variant: "destructive"
      });
      return;
    }
    
    if (confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleEditClick = (user: UserWithTournamentRoles) => {
    // Gate: only allow edit if permissions are valid
    if (!canEditUser(user)) {
      toast({
        title: "Error",
        description: "No tienes permisos para editar este usuario",
        variant: "destructive"
      });
      return;
    }
    setEditingUserId(user.id);
  };

  const handleOpenUserForm = (user?: User) => {
    setEditingUser(user || null);
    setUserFormModalOpen(true);
  };

  const handleCloseUserForm = () => {
    setEditingUser(null);
    setUserFormModalOpen(false);
  };

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return null;
    const country = COUNTRIES.find(c => c.code === countryCode);
    return country?.flag || null;
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return null;
    return MATCH_CATEGORIES_LABELS[category] || category;
  };

  // Reset editing state when permissions change
  useEffect(() => {
    if (editingUserId) {
      const user = users.find(u => u.id === editingUserId);
      if (user && !canEditUser(user)) {
        setEditingUserId(null);
      }
    }
  }, [currentUser, users, editingUserId]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "superadmin": return "destructive";
      case "admin": return "destructive";
      case "tournament_admin": return "default";
      case "organizador": return "default";
      case "arbitro": return "secondary";
      case "escrutador": return "secondary";
      default: return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "superadmin": return "SuperAdmin";
      case "admin": return "Admin";
      case "tournament_admin": return "Admin de Torneo";
      case "organizador": return "Organizador";
      case "arbitro": return "Árbitro";
      case "escrutador": return "Escrutador";
      case "jugador": return "Jugador";
      default: return role;
    }
  };

  const canEditUser = (user: UserWithTournamentRoles): boolean => {
    if (!currentUser) return false;
    
    // Cannot edit yourself
    if (user.id === currentUser.id) return false;
    
    // Admin legacy cannot edit superadmin users
    if (user.role === 'superadmin' && currentUser.role !== 'superadmin') return false;
    
    return true;
  };

  const canDeleteUser = (user: UserWithTournamentRoles): boolean => {
    if (!currentUser) return false;
    
    // Cannot delete yourself
    if (user.id === currentUser.id) return false;
    
    // Admin legacy cannot delete superadmin users
    if (user.role === 'superadmin' && currentUser.role !== 'superadmin') return false;
    
    return true;
  };

  const getAvailableRoles = () => {
    if (currentUser?.role === 'superadmin') {
      return [
        { value: "superadmin", label: "SuperAdmin" },
        { value: "admin", label: "Admin" },
        { value: "organizador", label: "Organizador" },
        { value: "arbitro", label: "Árbitro" },
        { value: "escrutador", label: "Escrutador" },
        { value: "jugador", label: "Jugador" },
      ];
    }
    // Admin legacy cannot assign superadmin
    return [
      { value: "admin", label: "Admin" },
      { value: "organizador", label: "Organizador" },
      { value: "arbitro", label: "Árbitro" },
      { value: "escrutador", label: "Escrutador" },
      { value: "jugador", label: "Jugador" },
    ];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Gestión de Usuarios</h3>
          <p className="text-muted-foreground">Administra usuarios y asigna roles</p>
        </div>
        <Button onClick={() => handleOpenUserForm()} data-testid="button-new-user">
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <UserFormModal 
        user={editingUser} 
        open={userFormModalOpen} 
        onClose={handleCloseUserForm}
      />

      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay usuarios registrados
            </p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-border rounded-lg" data-testid={`user-row-${user.id}`}>
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      {user.photoUrl ? (
                        <AvatarImage src={user.photoUrl} alt={user.name} />
                      ) : null}
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <p className="font-medium text-card-foreground" data-testid={`user-name-${user.id}`}>
                          {user.name}
                        </p>
                        {getCountryFlag(user.nationality) && (
                          <span className="text-xl" title={COUNTRIES.find(c => c.code === user.nationality)?.name}>
                            {getCountryFlag(user.nationality)}
                          </span>
                        )}
                        <Badge variant={getRoleBadgeVariant(user.role)} data-testid={`user-role-badge-${user.id}`}>
                          {user.role === 'superadmin' && <Shield className="h-3 w-3 mr-1" />}
                          {getRoleLabel(user.role)}
                        </Badge>
                        {user.categories && user.categories.length > 0 && user.categories.map((cat, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {getCategoryLabel(cat)}
                          </Badge>
                        ))}
                        {user.tournamentRoles?.map((tr, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="text-xs"
                            data-testid={`tournament-role-badge-${user.id}-${idx}`}
                          >
                            {getRoleLabel(tr.role)} @ {tr.tournamentName}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p data-testid={`user-email-${user.id}`}>{user.email}</p>
                        {user.club && <p>{user.club}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenUserForm(user)}
                      disabled={!canEditUser(user)}
                      data-testid={`button-edit-user-${user.id}`}
                      title="Editar perfil completo"
                    >
                      <UserIcon className="h-4 w-4" />
                    </Button>

                    {editingUserId === user.id ? (
                      <Select 
                        defaultValue={user.role} 
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                        data-testid={`role-select-${user.id}`}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableRoles().map(role => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(user)}
                        disabled={!canEditUser(user)}
                        data-testid={`button-edit-role-${user.id}`}
                        title="Editar rol"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={!canDeleteUser(user)}
                      className="text-destructive hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid={`button-delete-user-${user.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
