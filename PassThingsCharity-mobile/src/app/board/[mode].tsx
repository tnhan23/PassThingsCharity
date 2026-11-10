import { useLocalSearchParams } from "expo-router";
import { BoardScreen } from "@/screens/coverage";

const allowed = ["active", "draft", "window", "completed", "cancelled", "loading", "error"] as const;
type Mode = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: Mode = allowed.includes(mode as Mode) ? (mode as Mode) : "active";
  return <BoardScreen mode={value} />;
}
