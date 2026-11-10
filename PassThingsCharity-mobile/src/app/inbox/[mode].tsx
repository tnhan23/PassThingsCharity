import { useLocalSearchParams } from "expo-router";
import { InboxScreen } from "@/screens/coverage";

const allowed = ["content", "empty", "error", "loading"] as const;
type Mode = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: Mode = allowed.includes(mode as Mode) ? (mode as Mode) : "content";
  return <InboxScreen mode={value} />;
}
