import { useLocalSearchParams } from "expo-router";
import { IntakeScreen } from "@/screens/intake";

const allowed = ["review", "accepted", "rejected", "guest", "failed", "loading", "empty"] as const;
type State = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: State = allowed.includes(mode as State) ? (mode as State) : "review";
  return <IntakeScreen state={value} />;
}
