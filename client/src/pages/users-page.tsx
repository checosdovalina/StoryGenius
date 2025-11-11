import { AppShell } from "@/components/app-shell";
import { UserManagementView } from "@/components/user-management-view";

export default function UsersPage() {
  return (
    <AppShell>
      <UserManagementView />
    </AppShell>
  );
}
