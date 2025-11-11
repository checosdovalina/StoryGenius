import { AppShell } from "@/components/app-shell";
import { TournamentManagementView } from "@/components/tournament-management-view";

export default function TournamentsPage() {
  return (
    <AppShell>
      <TournamentManagementView />
    </AppShell>
  );
}
