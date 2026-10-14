import { useLocalSearchParams } from "expo-router";
import { StaffScreen } from "@/screens/coverage";

const allowed = ["roster", "empty", "loading", "error"] as const;
type Mode = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: Mode = allowed.includes(mode as Mode) ? (mode as Mode) : "roster";
  return <StaffScreen mode={value} />;
}
