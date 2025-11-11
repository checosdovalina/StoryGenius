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
  List
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface RouteConfig {
  path: string;
  label: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  roles: string[];
}

export const routes: RouteConfig[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    title: "Dashboard",
    subtitle: "Resumen general del sistema",
    icon: Home,
    roles: ["admin", "jugador", "organizador", "arbitro", "escrutador", "escribano"]
  },
  {
    path: "/users",
    label: "Gestión de Usuarios",
    title: "Gestión de Usuarios",
    subtitle: "Administra usuarios y roles",
    icon: Users,
    roles: ["admin"]
  },
  {
    path: "/tournaments",
    label: "Torneos",
    title: "Gestión de Torneos",
    subtitle: "Crea y administra torneos",
    icon: Trophy,
    roles: ["admin", "organizador"]
  },
  {
    path: "/club",
    label: "Club",
    title: "Gestión de Club",
    subtitle: "Administra información del club y canchas",
    icon: Building,
    roles: ["admin", "organizador"]
  },
  {
    path: "/courts",
    label: "Canchas",
    title: "Gestión de Canchas",
    subtitle: "Administra canchas y horarios",
    icon: MapPin,
    roles: ["admin", "organizador"]
  },
  {
    path: "/calendar",
    label: "Calendario",
    title: "Calendario",
    subtitle: "Programación de partidos",
    icon: Calendar,
    roles: ["admin", "organizador"]
  },
  {
    path: "/my-tournaments",
    label: "Mis Torneos",
    title: "Mis Torneos",
    subtitle: "Torneos y inscripciones",
    icon: List,
    roles: ["jugador"]
  },
  {
    path: "/statistics",
    label: "Estadísticas",
    title: "Estadísticas",
    subtitle: "Tu rendimiento deportivo",
    icon: BarChart3,
    roles: ["admin", "jugador", "organizador", "arbitro", "escrutador", "escribano"]
  },
  {
    path: "/match-results",
    label: "Registro de Resultados",
    title: "Registro de Resultados",
    subtitle: "Registra resultados oficiales",
    icon: ClipboardList,
    roles: ["arbitro", "escrutador", "escribano"]
  },
  {
    path: "/rankings",
    label: "Rankings",
    title: "Rankings",
    subtitle: "Clasificaciones y posiciones",
    icon: Medal,
    roles: ["admin", "jugador", "organizador", "arbitro", "escrutador", "escribano"]
  }
];

export function getRouteMeta(pathname: string): RouteConfig | undefined {
  // Exact match first
  const exactMatch = routes.find(route => route.path === pathname);
  if (exactMatch) return exactMatch;
  
  // For nested routes (e.g., /tournaments/123), find parent route
  const parentMatch = routes.find(route => 
    route.path !== "/" && pathname.startsWith(route.path + "/")
  );
  return parentMatch;
}

export function getRoutesByRole(role: string): RouteConfig[] {
  return routes.filter(route => route.roles.includes(role));
}
