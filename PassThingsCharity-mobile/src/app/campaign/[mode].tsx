import { Redirect, useLocalSearchParams } from "expo-router";
import { CampaignScreen } from "@/screens/home";

const allowed = ["loading", "error", "empty"] as const;
type Mode = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  if (!allowed.includes(mode as Mode)) return <Redirect href="/campaign" />;
  return <CampaignScreen mode={mode as Mode} />;
}
