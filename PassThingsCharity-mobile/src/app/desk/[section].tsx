import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Body, Button, Title } from "@/components/ui";
import { can, deskAccess, OpsGate, useRole } from "@/screens/ops/kit";
import { CampaignWork, CatalogScreen, OrgScreen, StationScreen } from "@/screens/ops/places";
import { AccountsScreen } from "@/screens/ops/accounts";
import { AlertCompose } from "@/screens/ops/alerts";
import { CrewWork, IntakeWork, ReliefWork, RewardWork, StockWork, TransferWork } from "@/screens/ops/flow";

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
  stock: StockWork,
  users: AccountsScreen,
  alerts: AlertCompose,
};

export default function DeskSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const role = useRole();
  const Page = pages[section as keyof typeof pages];
  const allowed = deskAccess[section as keyof typeof deskAccess];
  if (!Page || !allowed) return <Redirect href="/desk" />;
  const viewIntake = section === "intake" && role === "ADMIN";
  if (!can(role, [...allowed]) && !viewIntake) {
    return (
      <OpsGate>
        <Title>Mục này không mở cho vai trò hiện tại</Title>
        <Body>Máy chủ không cho tài khoản này làm việc ở đây.</Body>
        <Button label="Về vận hành" onPress={() => router.replace("/desk")} />
      </OpsGate>
    );
  }
  return <Page />;
}
