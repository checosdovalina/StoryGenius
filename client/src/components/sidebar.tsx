import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { 
  Trophy, 
  Home, 
  Users, 
  Calendar, 
  MapPin, 
  Building,
  BarChart3, 
  Medal, 
  ClipboardList, 
  List,
  LogOut,
  User
} from "lucide-react";
import type { ViewType } from "@/pages/home-page";

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SidebarContent({ 
  currentView, 
  onViewChange, 
  collapsed,
  onItemClick
}: { 
  currentView: ViewType; 
  onViewChange: (view: ViewType) => void; 
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  const navigationItems = [
    {
      id: "dashboard" as ViewType,
      label: "Dashboard",
      icon: Home,
      roles: ["admin", "jugador", "organizador", "arbitro", "escrutador", "escribano"]
    },
    {
      id: "userManagement" as ViewType,
      label: "Gestión de Usuarios",
      icon: Users,
      roles: ["admin"]
    },
    {
      id: "tournaments" as ViewType,
      label: "Torneos",
      icon: Trophy,
      roles: ["admin", "organizador"]
    },
    {
      id: "club" as ViewType,
      label: "Club",
      icon: Building,
      roles: ["admin", "organizador"]
    },
    {
      id: "courts" as ViewType,
      label: "Canchas",
      icon: MapPin,
      roles: ["admin", "organizador"]
    },
    {
      id: "calendar" as ViewType,
      label: "Calendario",
      icon: Calendar,
      roles: ["admin", "organizador"]
    },
    {
      id: "myTournaments" as ViewType,
      label: "Mis Torneos",
      icon: List,
      roles: ["jugador"]
    },
    {
      id: "statistics" as ViewType,
      label: "Estadísticas",
      icon: BarChart3,
      roles: ["jugador"]
    },
    {
      id: "matchResults" as ViewType,
      label: "Registro de Resultados",
      icon: ClipboardList,
      roles: ["arbitro", "escrutador", "escribano"]
    },
    {
      id: "rankings" as ViewType,
      label: "Rankings",
      icon: Medal,
      roles: ["admin", "jugador", "organizador", "arbitro", "escrutador", "escribano"]
    }
  ];

  const visibleItems = navigationItems.filter(item => 
    item.roles.includes(user.role)
  );

  const handleNavClick = (viewId: ViewType) => {
    onViewChange(viewId);
    onItemClick?.();
  };

  return (
    <>
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Trophy className="text-primary-foreground text-lg" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-card-foreground">GBSport</h1>
              <p className="text-sm text-muted-foreground">Gestión de Torneos</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  collapsed && "px-2"
                )}
                onClick={() => handleNavClick(item.id)}
                data-testid={`nav-${item.id}`}
              >
                <Icon className={cn("h-4 w-4", !collapsed && "mr-3")} />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className={cn(
          "flex items-center mb-3",
          collapsed ? "justify-center" : "space-x-3"
        )}>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="text-primary-foreground text-sm" />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-card-foreground" data-testid="user-name">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="user-role">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full",
            collapsed ? "px-2" : "justify-start"
          )}
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && <span>Cerrar Sesión</span>}
        </Button>
      </div>
    </>
  );
}

export function Sidebar({ currentView, onViewChange, collapsed, mobileOpen = false, onMobileClose }: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "bg-card border-r border-border shadow-sm transition-all duration-300 hidden md:flex md:flex-col",
        collapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent 
          currentView={currentView} 
          onViewChange={onViewChange} 
          collapsed={collapsed}
        />
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
        <SheetContent side="left" className="w-64 p-0 bg-card">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de navegación</SheetTitle>
          </SheetHeader>
          <SidebarContent 
            currentView={currentView} 
            onViewChange={onViewChange} 
            collapsed={false}
            onItemClick={onMobileClose}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
