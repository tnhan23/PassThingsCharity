import { useLocalSearchParams } from "expo-router";
import { ReceiptScreen } from "@/screens/more";

const allowed = ["done", "pending", "rejected", "loading", "error"] as const;
type State = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: State = allowed.includes(mode as State) ? (mode as State) : "done";
  return <ReceiptScreen state={value} />;
}
