import { Button } from "@/components/ui/button";
import { Bell, Settings, Menu, Monitor } from "lucide-react";
import { useLocation } from "wouter";
import { getRouteMeta } from "@/lib/routes";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const [location] = useLocation();
  const routeMeta = getRouteMeta(location);
  
  const title = routeMeta?.title || "GB Sport";
  const subtitle = routeMeta?.subtitle || "Sistema de Gestión de Torneos";

  const openDisplay = () => {
    window.open("/public-display", "PublicDisplay", "width=1920,height=1080");
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="md:hidden"
            data-testid="button-toggle-sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-card-foreground" data-testid="header-title">
              {title}
            </h2>
            <p className="text-muted-foreground" data-testid="header-subtitle">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={openDisplay}
            data-testid="button-public-display"
            className="gap-2"
          >
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Display</span>
          </Button>
          <Button variant="ghost" size="sm" data-testid="button-notifications">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="button-settings">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </header>
  );
}
