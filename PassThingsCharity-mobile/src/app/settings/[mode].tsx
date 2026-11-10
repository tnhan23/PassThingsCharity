import { Redirect, useLocalSearchParams } from "expo-router";
import { SettingsScreen } from "@/screens/more";

const allowed = ["off", "save-error"] as const;
type Mode = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  if (!allowed.includes(mode as Mode)) return <Redirect href="/settings" />;
  return <SettingsScreen mode={mode as Mode} />;
}
