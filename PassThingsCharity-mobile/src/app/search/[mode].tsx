import { Redirect, useLocalSearchParams } from "expo-router";
import { SearchScreen } from "@/screens/home";

const allowed = ["loading", "error"] as const;
type Mode = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  if (!allowed.includes(mode as Mode)) return <Redirect href="/search" />;
  return <SearchScreen mode={mode as Mode} />;
}
