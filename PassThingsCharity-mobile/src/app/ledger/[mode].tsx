import { useLocalSearchParams } from "expo-router";
import { LedgerScreen } from "@/screens/coverage";

const allowed = ["content", "loading", "error", "empty"] as const;
type Mode = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: Mode = allowed.includes(mode as Mode) ? (mode as Mode) : "content";
  return <LedgerScreen mode={value} />;
}
