import { useLocalSearchParams } from "expo-router";
import { DistributionScreen } from "@/screens/logistics";

const allowed = ["handover", "exception", "done", "lots", "loading", "error", "empty"] as const;
type State = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: State = allowed.includes(mode as State) ? (mode as State) : "handover";
  return <DistributionScreen state={value} />;
}
