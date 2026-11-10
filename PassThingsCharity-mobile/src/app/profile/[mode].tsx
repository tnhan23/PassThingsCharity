import { useLocalSearchParams } from "expo-router";
import { ProfileScreen } from "@/screens/profile";

const allowed = ["full", "low", "empty", "loading", "error"] as const;
type State = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: State = allowed.includes(mode as State) ? (mode as State) : "full";
  return <ProfileScreen state={value} />;
}
