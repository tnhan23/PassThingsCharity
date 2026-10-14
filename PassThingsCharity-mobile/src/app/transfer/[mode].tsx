import { useLocalSearchParams } from "expo-router";
import { TransferScreen } from "@/screens/logistics";

const allowed = ["create", "transit", "received", "preparing", "short", "cancelled", "loading", "error", "empty"] as const;
type State = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: State = allowed.includes(mode as State) ? (mode as State) : "create";
  return <TransferScreen state={value} />;
}
