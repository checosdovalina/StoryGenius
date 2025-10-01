import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { DashboardView } from "@/components/dashboard-view";
import { UserManagementView } from "@/components/user-management-view";
import { TournamentManagementView } from "@/components/tournament-management-view";
import { CalendarView } from "@/components/calendar-view";
import { ClubView } from "@/components/club-view";
import { CourtsManagementView } from "@/components/courts-management-view";
import { StatisticsView } from "@/components/statistics-view";
import { RankingsView } from "@/components/rankings-view";
import { MatchResultsView } from "@/components/match-results-view";
import { MyTournamentsView } from "@/components/my-tournaments-view";

export type ViewType = 
  | "dashboard" 
  | "userManagement" 
  | "tournaments" 
  | "calendar" 
  | "club" 
  | "courts" 
  | "statistics" 
  | "rankings" 
  | "matchResults" 
  | "myTournaments";

export default function HomePage() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (!user) {
    return <div>Loading...</div>; // ProtectedRoute will handle redirection
  }

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardView />;
      case "userManagement":
        return <UserManagementView />;
      case "tournaments":
        return <TournamentManagementView />;
      case "calendar":
        return <CalendarView />;
      case "club":
        return <ClubView />;
      case "courts":
        return <CourtsManagementView />;
      case "statistics":
        return <StatisticsView />;
      case "rankings":
        return <RankingsView />;
      case "matchResults":
        return <MatchResultsView />;
      case "myTournaments":
        return <MyTournamentsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      
      <main className="flex-1 overflow-auto">
        <Header 
          currentView={currentView}
          onToggleSidebar={() => {
            // Desktop: toggle collapse
            setSidebarCollapsed(!sidebarCollapsed);
            // Mobile: open drawer
            setMobileSidebarOpen(true);
          }}
        />
        
        <div className="p-4 md:p-6">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
