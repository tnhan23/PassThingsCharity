import { useLocalSearchParams } from "expo-router";
import { ShiftScreen } from "@/screens/volunteer";

const allowed = ["detail", "confirm", "reason", "cancelled", "success", "missing"] as const;
type State = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: State = allowed.includes(mode as State) ? (mode as State) : "detail";
  return <ShiftScreen state={value} />;
}
