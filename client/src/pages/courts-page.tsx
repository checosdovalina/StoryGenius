import { AppShell } from "@/components/app-shell";
import { CourtsManagementView } from "@/components/courts-management-view";

export default function CourtsPage() {
  return (
    <AppShell>
      <CourtsManagementView />
    </AppShell>
  );
}
