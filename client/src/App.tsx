import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import DashboardPage from "@/pages/dashboard-page";
import UsersPage from "@/pages/users-page";
import TournamentsPage from "@/pages/tournaments-page";
import ClubPage from "@/pages/club-page";
import CourtsPage from "@/pages/courts-page";
import CalendarPage from "@/pages/calendar-page";
import MyTournamentsPage from "@/pages/my-tournaments-page";
import StatisticsPage from "@/pages/statistics-page";
import MatchResultsPage from "@/pages/match-results-page";
import RankingsPage from "@/pages/rankings-page";
import AuthPage from "@/pages/auth-page";
import TournamentDetailPage from "@/pages/tournament-detail-page";
import StatsCapturePageComponent from "@/pages/stats-capture-page";
import NotFound from "@/pages/not-found";

function RootRedirect() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  const redirectPath = user.role === "jugador" ? "/my-tournaments" : "/dashboard";
  return <Redirect to={redirectPath} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <ProtectedRoute path="/tournaments" component={TournamentsPage} />
      <ProtectedRoute path="/tournaments/:id" component={TournamentDetailPage} />
      <ProtectedRoute path="/club" component={ClubPage} />
      <ProtectedRoute path="/courts" component={CourtsPage} />
      <ProtectedRoute path="/calendar" component={CalendarPage} />
      <ProtectedRoute path="/my-tournaments" component={MyTournamentsPage} />
      <ProtectedRoute path="/statistics" component={StatisticsPage} />
      <ProtectedRoute path="/match-results" component={MatchResultsPage} />
      <ProtectedRoute path="/rankings" component={RankingsPage} />
      <ProtectedRoute path="/stats/capture/:matchId" component={StatsCapturePageComponent} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
