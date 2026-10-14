import { Redirect, useLocalSearchParams } from "expo-router";
import { FeedbackScreen } from "@/screens/more";

const allowed = ["sent", "invalid"] as const;
type Mode = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  if (!allowed.includes(mode as Mode)) return <Redirect href="/feedback" />;
  return <FeedbackScreen mode={mode as Mode} />;
}
