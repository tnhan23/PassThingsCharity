import { useLocalSearchParams } from "expo-router";
import { StationsScreen } from "@/screens/more";

const allowed = ["list", "map", "overload", "closed", "loading", "error", "denied"] as const;
type State = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: State = allowed.includes(mode as State) ? (mode as State) : "list";
  return <StationsScreen state={value} />;
}
