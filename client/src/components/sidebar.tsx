import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { LogOut, User } from "lucide-react";
import logoImage from "@assets/gbsport-logo.png";
import { getRoutesByRole } from "@/lib/routes";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SidebarContent({ 
  collapsed,
  onItemClick
}: { 
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const visibleRoutes = getRoutesByRole(user.role);

  return (
    <>
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <img 
            src={logoImage} 
            alt="GB Sport Logo" 
            className={cn(
              "object-contain transition-all duration-200",
              collapsed ? "w-10 h-10" : "w-20 h-20"
            )}
          />
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-card-foreground">GB Sport</h1>
              <p className="text-sm text-muted-foreground">Gestión de Torneos</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {visibleRoutes.map((route) => {
            const Icon = route.icon;
            // Exact match or nested route (e.g., /tournaments/123 matches /tournaments)
            const isActive = location === route.path || 
                            (location.startsWith(route.path + "/") && route.path !== "/");
            
            return (
              <Link key={route.path} href={route.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    collapsed && "px-2"
                  )}
                  onClick={onItemClick}
                  data-testid={`nav-${route.path.replace("/", "")}`}
                >
                  <Icon className={cn("h-4 w-4", !collapsed && "mr-3")} />
                  {!collapsed && <span>{route.label}</span>}
                </Button>
              </Link>
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

export function Sidebar({ collapsed, mobileOpen = false, onMobileClose, onToggle }: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "bg-card border-r border-border shadow-sm transition-all duration-300 hidden md:flex md:flex-col",
        collapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent 
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
            collapsed={false}
            onItemClick={onMobileClose}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
