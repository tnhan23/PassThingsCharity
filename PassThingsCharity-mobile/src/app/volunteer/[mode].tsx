import { useLocalSearchParams } from "expo-router";
import { VolunteerScreen } from "@/screens/volunteer";

const allowed = ["tasks", "pending", "active", "form", "approved", "revision", "rejected", "cancelled", "empty", "done", "assigned", "loading", "error", "form-error"] as const;
type State = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: State = allowed.includes(mode as State) ? (mode as State) : "tasks";
  return <VolunteerScreen state={value} />;
}
