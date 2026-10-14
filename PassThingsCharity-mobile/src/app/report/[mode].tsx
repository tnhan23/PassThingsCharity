import { useLocalSearchParams } from "expo-router";
import { ReportScreen } from "@/screens/coverage";

const allowed = ["content", "empty", "loading", "error"] as const;
type Mode = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: Mode = allowed.includes(mode as Mode) ? (mode as Mode) : "content";
  return <ReportScreen mode={value} />;
}
