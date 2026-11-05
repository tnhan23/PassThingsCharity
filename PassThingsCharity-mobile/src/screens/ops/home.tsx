import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ApiError } from "@/api/client";
import { backend } from "@/api/backend";
import { useSession } from "@/api/session";
import type { CampaignSummary, ContributionRow, NamedRef, StationRow, TransferRow } from "@/api/types";
import { Body, Button, Icon, Tap, Title } from "@/components/ui";
import { Screen } from "@/components/chrome";
import { can, deskAccess, OpsGate, useRole } from "@/screens/ops/kit";
import { colors, fonts } from "@/theme";

const sections = [
  { key: "users", href: "/desk/users", title: "Tài khoản", body: "Xem người dùng, khóa hoặc mở khóa." },
  { key: "alerts", href: "/desk/alerts", title: "Gửi thông báo", body: "Gửi tin khẩn cho mọi người hoặc cho nhân viên." },
  { key: "orgs", href: "/desk/orgs", title: "Tổ chức", body: "Duyệt hoặc từ chối đơn lập tổ chức." },
  { key: "stations", href: "/desk/stations", title: "Trạm", body: "Duyệt trạm do quản lý tổ chức gửi." },
  { key: "catalog", href: "/desk/catalog", title: "Danh mục đồ", body: "Thêm nhóm và loại đồ. Đơn vị nằm trên loại đồ." },
  { key: "campaigns", href: "/desk/campaigns", title: "Chiến dịch", body: "Tạo chiến dịch, phát hành, gắn đồ và gắn trạm." },
  { key: "intake", href: "/desk/intake", title: "Tiếp nhận", body: "Tìm người trao, ghi phiếu, và đổi trạng thái phiếu." },
  { key: "transfers", href: "/desk/transfers", title: "Điều chuyển", body: "Lập lệnh chuyển giữa hai trạm và đổi trạng thái lệnh." },
  { key: "relief", href: "/desk/relief", title: "Giao hàng", body: "Ghi đợt giao. Đóng cả chiến dịch là một nút riêng." },
  { key: "crew", href: "/desk/crew", title: "Nhân sự", body: "Duyệt tình nguyện, tạo việc, và phân công." },
  { key: "rewards", href: "/desk/rewards", title: "Điểm và chứng nhận", body: "Cộng điểm, tạo mốc, và cấp chứng nhận." },
] as const;

const transferOpen = new Set(["PENDING", "PREPARING", "IN_TRANSIT", "RECEIVED"]);

const statusText: Record<string, string> = {
  PENDING: "Chờ xử lý",
  PUBLISHED: "Sắp mở",
  ACTIVE: "Đang nhận",
  PREPARING: "Đang soạn",
  IN_TRANSIT: "Đang chuyển",
  RECEIVED: "Đã nhận tại trạm",
  ACCEPTED: "Đã tiếp nhận",
  REJECTED: "Từ chối",
  COMPLETED: "Đã xong",
  CANCELLED: "Đã hủy",
};

function spoken(status?: string) {
  if (!status) return "";
  return statusText[status] || status;
}

function placeName(value: NamedRef | undefined) {
  if (!value || typeof value === "string") return "";
  return value.name || value.title || "";
}

function WorkRow({ title, detail, href, plain }: { title: string; detail: string; href: Href; plain?: boolean }) {
  return (
    <Tap onPress={() => router.push(href)} accessibilityLabel={title} style={plain ? rowPlain : rowStyle}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={rowTitle}>{title}</Text>
        {detail ? <Text style={rowDetail}>{detail}</Text> : null}
      </View>
      <Icon name="chevron-right" size={20} color={colors.outline} />
    </Tap>
  );
}

const rowStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 12,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: colors.hairline,
};

const rowPlain = { ...rowStyle, borderBottomWidth: 0, paddingVertical: 6 };
const panel = {
  backgroundColor: colors.card,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.hairline,
  padding: 14,
  gap: 8,
};
const panelTitle = { fontFamily: fonts.bold, fontSize: 17, color: colors.ink };
const panelCount = { fontFamily: fonts.bold, fontSize: 17, color: colors.primary };
const rowTitle = { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink };
const rowDetail = { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted };

const toolIcon = {
  users: "group",
  alerts: "campaign",
  orgs: "apartment",
  stations: "warehouse",
  catalog: "category",
  campaigns: "campaign",
  intake: "receipt-long",
  transfers: "swap-horiz",
  relief: "local-shipping",
  crew: "groups",
  rewards: "stars",
} as const;

const toolGrid = { flexDirection: "row" as const, flexWrap: "wrap" as const, marginHorizontal: -4 };
const toolCell = { width: "50%" as const, padding: 4 };
const toolTile = {
  backgroundColor: colors.card,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.hairline,
  minHeight: 84,
  padding: 12,
  gap: 8,
  justifyContent: "space-between" as const,
};
const toolLabel = { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink };

function Figures({ items }: { items: { key: string; value: number; label: string; href: Href }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
      {items.map((item) => (
        <View key={item.key} style={{ width: "50%", padding: 4 }}>
          <Tap
            onPress={() => router.push(item.href)}
            accessibilityLabel={`${item.value} ${item.label}`}
            style={{ backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 4, minHeight: 88 }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 32, lineHeight: 36, color: colors.onPrimary }}>{String(item.value)}</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.primarySoft }}>{item.label}</Text>
          </Tap>
        </View>
      ))}
    </View>
  );
}

function SplitBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (total === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: colors.surfaceContainer }}>
        {parts.filter((part) => part.value > 0).map((part) => (
          <View key={part.label} style={{ width: `${(part.value / total) * 100}%`, backgroundColor: part.color }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {parts.map((part) => (
          <Text key={part.label} style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.ink }}>{`${part.value} ${part.label}`}</Text>
        ))}
      </View>
    </View>
  );
}

function Board({ title, href, rows }: { title: string; href: Href; rows: { id: string; title: string; detail: string }[] }) {
  if (!rows.length) return null;
  return (
    <View style={panel}>
      <Tap onPress={() => router.push(href)} accessibilityLabel={title} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={panelTitle}>{title}</Text>
        <Text style={panelCount}>{String(rows.length)}</Text>
      </Tap>
      {rows.map((row) => (
        <WorkRow key={row.id} title={row.title} detail={row.detail} href={href} plain />
      ))}
    </View>
  );
}

export function OpsHome() {
  const role = useRole();
  const { token } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgs, setOrgs] = useState<{ _id: string; name: string; status?: string }[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [receipts, setReceipts] = useState<ContributionRow[]>([]);
  const [moves, setMoves] = useState<TransferRow[]>([]);
  const [stations, setStations] = useState<StationRow[]>([]);
  const visible = sections.filter((section) => can(role, [...deskAccess[section.key]]));
  const seesOrgs = can(role, [...deskAccess.orgs]);
  const seesIntake = can(role, [...deskAccess.intake]);
  const seesTransfers = can(role, [...deskAccess.transfers]);
  const seesStations = can(role, [...deskAccess.stations]);

  useEffect(() => {
    if (!token || !role) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    const jobs: Promise<unknown>[] = [
      backend.listCampaigns().then((data) => {
        if (!cancelled) setCampaigns(data.campaigns);
      }),
    ];
    if (seesOrgs) {
      jobs.push(backend.listOrganizations(token).then((data) => {
        if (!cancelled) setOrgs(data.data);
      }));
    }
    if (seesIntake) {
      jobs.push(backend.listContributions(token).then((data) => {
        if (!cancelled) setReceipts(data.data);
      }));
    }
    if (seesTransfers) {
      jobs.push(backend.listTransfers(token).then((data) => {
        if (!cancelled) setMoves(data.data);
      }));
    }
    if (seesStations) {
      jobs.push(backend.listStations(token).then((data) => {
        if (!cancelled) setStations(data.data);
      }));
    }
    Promise.allSettled(jobs).then((results) => {
      if (cancelled) return;
      const failed = results.find((item) => item.status === "rejected");
      if (failed && failed.status === "rejected") {
        const caught = failed.reason;
        setError(caught instanceof ApiError ? caught.message : "Một phần bảng điều khiển không tải được.");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [role, seesIntake, seesOrgs, seesStations, seesTransfers, token]);

  const pendingOrgs = orgs.filter((org) => org.status === "PENDING").slice(0, 5);
  const soon = campaigns.filter((row) => row.status === "PUBLISHED" && !row.title.startsWith("[Mẫu]")).slice(0, 4);
  const open = campaigns.filter((row) => row.status === "ACTIVE" && !row.title.startsWith("[Mẫu]")).slice(0, 4);
  const fresh = receipts.filter((row) => !row.code.startsWith("SAMPLE-"));
  const waiting = [...fresh.filter((row) => row.status === "PENDING"), ...fresh.filter((row) => row.status !== "PENDING")].slice(0, 5);
  const moving = moves.filter((row) => transferOpen.has(row.status)).slice(0, 5);
  const quiet = !loading && pendingOrgs.length + soon.length + open.length + waiting.length + moving.length === 0;
  const pendingCount = orgs.filter((org) => org.status === "PENDING").length;
  const openCount = campaigns.filter((row) => row.status === "ACTIVE" && !row.title.startsWith("[Mẫu]")).length;
  const soonCount = campaigns.filter((row) => row.status === "PUBLISHED" && !row.title.startsWith("[Mẫu]")).length;
  const slipCount = fresh.filter((row) => row.status === "PENDING").length;
  const moveCount = moves.filter((row) => transferOpen.has(row.status)).length;
  const stationCount = stations.filter((row) => row.isActive).length;
  const doneCount = campaigns.filter((row) => (row.status === "COMPLETED" || row.status === "CANCELLED") && !row.title.startsWith("[Mẫu]")).length;
  const acceptedCount = fresh.filter((row) => row.status === "ACCEPTED" || row.status === "COMPLETED").length;
  const rejectedCount = fresh.filter((row) => row.status === "REJECTED").length;
  const figures = [
    role === "ADMIN" ? { key: "org", value: pendingCount, label: "Tổ chức chờ duyệt", href: "/desk/orgs" as const } : null,
    role === "ADMIN" ? { key: "waitStation", value: stations.filter((row) => !row.isActive).length, label: "Trạm chờ duyệt", href: "/desk/stations" as const } : null,
    { key: "open", value: openCount, label: "Chiến dịch đang nhận", href: "/desk/campaigns" as const },
    role === "ORG_MANAGER" ? { key: "soon", value: soonCount, label: "Chiến dịch sắp mở", href: "/desk/campaigns" as const } : null,
    seesIntake ? { key: "slip", value: slipCount, label: "Phiếu chờ xử lý", href: "/desk/intake" as const } : null,
    seesStations ? { key: "station", value: stationCount, label: "Trạm đang mở", href: "/desk/stations" as const } : null,
    seesTransfers ? { key: "move", value: moveCount, label: "Lệnh đang chuyển", href: "/desk/transfers" as const } : null,
  ].flatMap((item) => item ? [item] : []).slice(0, 4);

  return (
    <OpsGate>
      <Title>Bảng điều khiển</Title>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Body>{error}</Body> : null}
      {figures.length ? <Figures items={figures} /> : null}
      {openCount + soonCount + doneCount > 0 ? (
        <View style={panel}>
          <Text style={panelTitle}>Chiến dịch</Text>
          <SplitBar parts={[
            { label: "đang nhận", value: openCount, color: colors.primary },
            { label: "sắp mở", value: soonCount, color: colors.secondary },
            { label: "đã đóng", value: doneCount, color: colors.line },
          ]} />
        </View>
      ) : null}
      {seesIntake && acceptedCount + slipCount + rejectedCount > 0 ? (
        <View style={panel}>
          <Text style={panelTitle}>Phiếu</Text>
          <SplitBar parts={[
            { label: "đã tiếp nhận", value: acceptedCount, color: colors.primary },
            { label: "chờ xử lý", value: slipCount, color: colors.secondary },
            { label: "từ chối", value: rejectedCount, color: colors.error },
          ]} />
        </View>
      ) : null}
      {quiet ? <Body muted>Chưa có việc đang mở.</Body> : null}
      <Board title="Tổ chức chờ duyệt" href="/desk/orgs" rows={pendingOrgs.map((org) => ({ id: org._id, title: org.name, detail: "Chờ duyệt" }))} />
      <Board title="Chiến dịch sắp mở" href="/desk/campaigns" rows={soon.map((row) => ({ id: row._id, title: row.title, detail: spoken(row.status) }))} />
      <Board title="Chiến dịch đang nhận" href="/desk/campaigns" rows={open.map((row) => ({ id: row._id, title: row.title, detail: spoken(row.status) }))} />
      {seesIntake ? <Board title="Phiếu gần nhất" href="/desk/intake" rows={waiting.map((row) => ({ id: row._id, title: row.code, detail: spoken(row.status) }))} /> : null}
      <Board title="Điều chuyển đang mở" href="/desk/transfers" rows={moving.map((row) => {
        const from = placeName(row.fromStationId);
        const to = placeName(row.toStationId);
        return { id: row._id, title: row.code, detail: from && to ? `Từ ${from} tới ${to}` : spoken(row.status) };
      })} />
      <Title>Mục làm việc</Title>
      <View style={toolGrid}>
        {visible.map((section) => (
          <View key={section.href} style={toolCell}>
            <Tap onPress={() => router.push(section.href)} accessibilityLabel={section.title} style={toolTile}>
              <Icon name={toolIcon[section.key]} size={22} color={colors.primary} />
              <Text style={toolLabel}>{section.title}</Text>
            </Tap>
          </View>
        ))}
      </View>
    </OpsGate>
  );
}

export function StaffHome() {
  return (
    <Screen tab="home">
      <Title>Việc ở quầy</Title>
      <Body>Ca trực, phiếu tiếp nhận, việc được giao và điểm cộng thêm.</Body>
      <Button label="Ca trực" onPress={() => router.push("/shifts")} />
      <Button label="Lập phiếu" onPress={() => router.push("/receive/new")} />
      <Button label="Phiếu đã lập" tone="ghost" onPress={() => router.push("/desk/intake")} />
      <Button label="Nhân sự" tone="ghost" onPress={() => router.push("/desk/crew")} />
      <Button label="Cộng điểm" tone="ghost" onPress={() => router.push("/desk/rewards")} />
    </Screen>
  );
}
