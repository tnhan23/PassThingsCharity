import { useLocalSearchParams } from "expo-router";
import { ReceiveScreen } from "@/screens/more";

const allowed = ["form", "error", "success", "stock", "sending"] as const;
type State = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: State = allowed.includes(mode as State) ? (mode as State) : "form";
  return <ReceiveScreen state={value} />;
}
