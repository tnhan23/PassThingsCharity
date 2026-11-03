import { Redirect, useLocalSearchParams } from "expo-router";
import { CampaignWork, CatalogScreen, OrgScreen, StationScreen } from "@/screens/ops/places";
import { CrewWork, IntakeWork, ReliefWork, RewardWork, TransferWork } from "@/screens/ops/flow";

const pages = {
  orgs: OrgScreen,
  stations: StationScreen,
  catalog: CatalogScreen,
  campaigns: CampaignWork,
  intake: IntakeWork,
  transfers: TransferWork,
  relief: ReliefWork,
  crew: CrewWork,
  rewards: RewardWork,
};

export default function DeskSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const Page = pages[section as keyof typeof pages];
  if (!Page) return <Redirect href="/desk" />;
  return <Page />;
}
