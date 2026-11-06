import { useSession } from "@/api/session";
import { useShell } from "@/api/shell";
import { HomeScreen } from "@/screens/home";
import { OpsHome, StaffHome } from "@/screens/ops/home";

export default function Page() {
  const { user } = useSession();
  const { desk } = useShell();
  if (!desk) return <HomeScreen />;
  if (user?.role === "STAFF") return <StaffHome />;
  return <OpsHome />;
}
