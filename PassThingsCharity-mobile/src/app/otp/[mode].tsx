import { useLocalSearchParams } from "expo-router";
import { OtpScreen } from "@/screens/more";

const allowed = ["enter", "resend", "error", "locked"] as const;
type State = (typeof allowed)[number];

export default function Page() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const value: State = allowed.includes(mode as State) ? (mode as State) : "enter";
  return <OtpScreen state={value} />;
}
