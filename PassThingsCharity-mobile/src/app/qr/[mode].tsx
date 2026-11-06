import { useLocalSearchParams } from "expo-router";
import { QrScreen } from "@/screens/more";

const allowed = ["scan", "error", "success", "expired", "checking"] as const;
type State = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: State = allowed.includes(mode as State) ? (mode as State) : "scan";
  return <QrScreen state={value} />;
}
