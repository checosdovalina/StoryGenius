import { Button } from "@/components/ui/button";
import { Bell, Settings, Menu } from "lucide-react";
import type { ViewType } from "@/pages/home-page";

interface HeaderProps {
  currentView: ViewType;
  onToggleSidebar: () => void;
}

const viewTitles: Record<ViewType, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Resumen general del sistema" },
  userManagement: { title: "Gestión de Usuarios", subtitle: "Administra usuarios y roles" },
  tournaments: { title: "Gestión de Torneos", subtitle: "Crea y administra torneos" },
  calendar: { title: "Calendario", subtitle: "Programación de partidos" },
  courts: { title: "Gestión de Canchas", subtitle: "Administra canchas y horarios" },
  statistics: { title: "Estadísticas", subtitle: "Tu rendimiento deportivo" },
  rankings: { title: "Rankings", subtitle: "Clasificaciones y posiciones" },
  matchResults: { title: "Registro de Resultados", subtitle: "Registra resultados oficiales" },
  myTournaments: { title: "Mis Torneos", subtitle: "Torneos y inscripciones" }
};

export function Header({ currentView, onToggleSidebar }: HeaderProps) {
  const { title, subtitle } = viewTitles[currentView];

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
