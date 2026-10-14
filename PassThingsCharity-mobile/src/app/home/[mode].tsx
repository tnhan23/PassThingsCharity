import { useLocalSearchParams } from "expo-router";
import { HomeScreen } from "@/screens/home";

const allowed = ["loading", "offline", "empty", "results", "none"] as const;
type State = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: State = allowed.includes(mode as State) ? (mode as State) : "empty";
  return <HomeScreen state={value} />;
}
