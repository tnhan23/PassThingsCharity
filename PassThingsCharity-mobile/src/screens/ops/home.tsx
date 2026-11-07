import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ApiError } from "@/api/client";
import { backend } from "@/api/backend";
import { useLocale, type CopyKey } from "@/api/locale";
import { useSession } from "@/api/session";
import type { CampaignSummary, ContributionRow, NamedRef, StationRow, TransferRow } from "@/api/types";
import { Badge, Body, Button, Card, Icon, Tap, Title } from "@/components/ui";
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
  { key: "transfers", href: "/desk/transfers", title: "Điều chuyển", body: "Chọn nhiều món trong kho trạm đi, rồi chọn trạm đến." },
  { key: "stock", href: "/desk/stock", title: "Kho trạm", body: "Xem số tồn, số đang giữ và số còn gửi được của từng món." },
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
  stock: "inventory",
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

const chartColors = [colors.primary, colors.secondary, colors.primaryContainer, colors.warning, colors.outline];

function useStill() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (live) setStill(value);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setStill);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return still;
}

function CountText({ value, light }: { value: number; light?: boolean }) {
  const still = useStill();
  const [shown, setShown] = useState(still ? value : 0);
  useEffect(() => {
    if (still) {
      setShown(value);
      return;
    }
    const started = Date.now();
    let frame = 0;
    const tick = () => {
      const progress = Math.min(1, (Date.now() - started) / 700);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [still, value]);
  return (
    <Text
      style={{
        fontFamily: fonts.bold,
        fontSize: light ? 30 : 16,
        lineHeight: light ? 34 : 20,
        color: light ? colors.onPrimary : colors.ink,
        fontVariant: ["tabular-nums"],
      }}
    >
      {String(shown)}
    </Text>
  );
}

function GrowBar({ fraction, color }: { fraction: number; color: string }) {
  const still = useStill();
  const scale = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    scale.value = still ? 1 : 0;
    scale.value = withTiming(1, { duration: still ? 0 : 800, easing: Easing.out(Easing.cubic) });
  }, [fraction, scale, still]);
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: scale.value }] }));
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceContainer, overflow: "hidden" }}>
      <Animated.View style={[{ height: 8, width: `${Math.max(fraction, 0) * 100}%`, backgroundColor: color, transformOrigin: "left center" }, bar]} />
    </View>
  );
}

function Figures({ items }: { items: { key: string; value: number; label: string; href: Href }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
      {items.map((item) => (
        <View key={item.key} style={{ width: "50%", padding: 4 }}>
          <Tap
            onPress={() => router.push(item.href)}
            accessibilityLabel={`${item.value} ${item.label}`}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 12,
              gap: 4,
              minHeight: 92,
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <CountText value={item.value} light />
              <Icon name="chevron-right" size={18} color={colors.primarySoft} />
            </View>
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.primarySoft }}>{item.label}</Text>
          </Tap>
        </View>
      ))}
    </View>
  );
}

function Columns({ title, rows }: { title: string; rows: { label: string; value: number; color: string }[] }) {
  const shown = rows.filter((row) => row.value > 0);
  const peak = Math.max(...shown.map((row) => row.value), 1);
  const total = shown.reduce((sum, row) => sum + row.value, 0);
  if (!shown.length) return null;
  return (
    <View style={panel}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={panelTitle}>{title}</Text>
        <Badge label={`Tổng ${total}`} tone="neutral" />
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, minHeight: 148 }}>
        {shown.map((row) => (
          <View key={row.label} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <CountText value={row.value} />
            <GrowColumn fraction={row.value / peak} color={row.color} />
            <Text numberOfLines={2} style={{ fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, textAlign: "center", color: colors.ink }}>{row.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function GrowColumn({ fraction, color }: { fraction: number; color: string }) {
  const still = useStill();
  const scale = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    scale.value = still ? 1 : 0;
    scale.value = withTiming(1, { duration: still ? 0 : 800, easing: Easing.out(Easing.cubic) });
  }, [fraction, scale, still]);
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));
  return (
    <View style={{ height: 88, width: "100%", justifyContent: "flex-end" }}>
      <Animated.View style={[{ height: Math.max(fraction, 0.08) * 88, width: "100%", backgroundColor: color, borderRadius: 8, transformOrigin: "bottom" }, bar]} />
    </View>
  );
}

function Stacked({ title, rows }: { title: string; rows: { label: string; value: number; color: string }[] }) {
  const shown = rows.filter((row) => row.value > 0);
  const total = shown.reduce((sum, row) => sum + row.value, 0);
  if (total === 0) return null;
  return (
    <View style={panel}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={panelTitle}>{title}</Text>
        <Badge label={`Tổng ${total}`} tone="neutral" />
      </View>
      <View style={{ flexDirection: "row", height: 18, borderRadius: 9, overflow: "hidden", backgroundColor: colors.surfaceContainer }}>
        {shown.map((row) => (
          <View key={row.label} style={{ width: `${(row.value / total) * 100}%`, backgroundColor: row.color }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {shown.map((row) => {
          const pct = Math.round((row.value / total) * 100);
          return (
            <View key={row.label} style={{ gap: 2, minWidth: 96 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: row.color }} />
                <CountText value={row.value} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted, fontVariant: ["tabular-nums"] }}>
                  {`(${pct}%)`}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.ink }}>{row.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Chart({ title, rows }: { title: string; rows: { label: string; value: number; color: string }[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (total === 0) return null;
  return (
    <View style={panel}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={panelTitle}>{title}</Text>
        <Badge label={`Tổng ${total}`} tone="neutral" />
      </View>
      {rows.filter((row) => row.value > 0).map((row) => {
        const pct = Math.round((row.value / total) * 100);
        return (
          <View key={row.label} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: row.color }} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.ink }}>{row.label}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                <CountText value={row.value} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted, fontVariant: ["tabular-nums"] }}>
                  {`${pct}%`}
                </Text>
              </View>
            </View>
            <GrowBar fraction={row.value / total} color={row.color} />
          </View>
        );
      })}
    </View>
  );
}

function buckets(values: string[], order: { status: string; label: string }[], otherLabel: string) {
  const known = new Set(order.map((item) => item.status));
  const rows = order.map((item, index) => ({
    label: item.label,
    value: values.filter((status) => status === item.status).length,
    color: chartColors[index % chartColors.length],
  }));
  const other = values.filter((status) => !known.has(status)).length;
  if (other > 0) rows.push({ label: otherLabel, value: other, color: colors.line });
  return rows;
}

function Board({ title, href, rows }: { title: string; href: Href; rows: { id: string; title: string; detail: string }[] }) {
  if (!rows.length) return null;
  return (
    <View style={panel}>
      <Tap onPress={() => router.push(href)} accessibilityLabel={title} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={panelTitle}>{title}</Text>
        <Badge label={`${rows.length} mục`} tone="primary" />
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
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgs, setOrgs] = useState<{ _id: string; name: string; status?: string }[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [receipts, setReceipts] = useState<ContributionRow[]>([]);
  const [moves, setMoves] = useState<TransferRow[]>([]);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [people, setPeople] = useState<{ role?: string }[]>([]);
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
    if (seesIntake || role === "ADMIN") {
      jobs.push(backend.listContributions(token).then((data) => {
        if (!cancelled) setReceipts(data.data);
      }));
    }
    if (role === "ADMIN") {
      jobs.push(backend.listUsers(token).then((data) => {
        if (!cancelled) setPeople(data.data);
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
  const moving = moves.filter((row) => transferOpen.has(row.status) && !String(row.code || "").startsWith("SAMPLE-")).slice(0, 5);
  const quiet = !loading && pendingOrgs.length + soon.length + open.length + waiting.length + moving.length === 0;
  const pendingCount = orgs.filter((org) => org.status === "PENDING").length;
  const openCount = campaigns.filter((row) => row.status === "ACTIVE" && !row.title.startsWith("[Mẫu]")).length;
  const soonCount = campaigns.filter((row) => row.status === "PUBLISHED" && !row.title.startsWith("[Mẫu]")).length;
  const slipCount = fresh.filter((row) => row.status === "PENDING").length;
  const moveCount = moves.filter((row) => transferOpen.has(row.status)).length;
  const stationCount = stations.filter((row) => row.isActive).length;
  const figures = [
    role === "ADMIN" ? { key: "people", value: people.length, label: t("dash.accounts"), href: "/desk/users" as const } : null,
    role === "ADMIN" || seesIntake ? { key: "slips", value: fresh.length, label: t("dash.slips"), href: "/desk/intake" as const } : null,
    role === "ADMIN" ? { key: "org", value: pendingCount, label: t("dash.orgWait"), href: "/desk/orgs" as const } : null,
    role === "ADMIN" ? { key: "waitStation", value: stations.filter((row) => !row.isActive).length, label: t("dash.stationWait"), href: "/desk/stations" as const } : null,
    { key: "open", value: openCount, label: t("dash.open"), href: "/desk/campaigns" as const },
    role === "ORG_MANAGER" ? { key: "soon", value: soonCount, label: t("dash.soon"), href: "/desk/campaigns" as const } : null,
    seesIntake ? { key: "slip", value: slipCount, label: t("dash.pendingSlip"), href: "/desk/intake" as const } : null,
    seesStations ? { key: "station", value: stationCount, label: t("dash.stationOpen"), href: "/desk/stations" as const } : null,
    seesTransfers ? { key: "move", value: moveCount, label: t("dash.moving"), href: "/desk/transfers" as const } : null,
  ].flatMap((item) => item ? [item] : []);

  return (
    <OpsGate>
      <Title>{t("dash.title")}</Title>
      {loading ? <Body muted>{t("dash.loading")}</Body> : null}
      {error ? <Body>{error}</Body> : null}
      {!loading && figures.length ? <Figures items={figures} /> : null}
      <Title>{t("dash.work")}</Title>
      <View style={toolGrid}>
        {visible.map((section) => (
          <View key={section.href} style={toolCell}>
            <Tap onPress={() => router.push(section.href)} accessibilityLabel={section.title} style={toolTile}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: colors.primarySoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={toolIcon[section.key]} size={19} color={colors.primary} />
                </View>
                <Icon name="chevron-right" size={18} color={colors.outline} />
              </View>
              <Text style={toolLabel}>{t(`work.${section.key}` as CopyKey)}</Text>
            </Tap>
          </View>
        ))}
      </View>
      {quiet ? <Body muted>{t("dash.quiet")}</Body> : null}
      <Board title="Tổ chức chờ duyệt" href="/desk/orgs" rows={pendingOrgs.map((org) => ({ id: org._id, title: org.name, detail: "Chờ duyệt" }))} />
      <Board title="Chiến dịch sắp mở" href="/desk/campaigns" rows={soon.map((row) => ({ id: row._id, title: row.title, detail: spoken(row.status) }))} />
      <Board title="Chiến dịch đang nhận" href="/desk/campaigns" rows={open.map((row) => ({ id: row._id, title: row.title, detail: spoken(row.status) }))} />
      {seesIntake ? <Board title="Phiếu gần nhất" href="/desk/intake" rows={waiting.map((row) => ({ id: row._id, title: row.code, detail: spoken(row.status) }))} /> : null}
      <Board title="Điều chuyển đang mở" href="/desk/transfers" rows={moving.map((row) => {
        const from = placeName(row.fromStationId);
        const to = placeName(row.toStationId);
        return { id: row._id, title: row.code, detail: from && to ? `Từ ${from} tới ${to}` : spoken(row.status) };
      })} />
      {!loading ? (
        <>
          {role === "ADMIN" ? (
            <Columns
              title={t("chart.roles")}
              rows={buckets(people.map((row) => row.role || ""), [
                { status: "USER", label: t("role.user") },
                { status: "VOLUNTEER", label: t("role.volunteer") },
                { status: "STAFF", label: t("role.staff") },
                { status: "STATION_MANAGER", label: t("role.station") },
                { status: "ORG_MANAGER", label: t("role.org") },
                { status: "ADMIN", label: t("role.admin") },
              ], t("status.other"))}
            />
          ) : null}
          <Stacked
            title={t("chart.campaigns")}
            rows={buckets(campaigns.filter((row) => !row.title.startsWith("[Mẫu]")).map((row) => row.status), [
              { status: "ACTIVE", label: t("status.active") },
              { status: "PUBLISHED", label: t("status.published") },
              { status: "DRAFT", label: t("status.draft") },
              { status: "COMPLETED", label: t("status.completed") },
              { status: "CANCELLED", label: t("status.cancelled") },
            ], t("status.other"))}
          />
          {role === "ADMIN" || seesIntake ? (
            <Chart
              title={t("chart.slips")}
              rows={buckets(fresh.map((row) => row.status), [
                { status: "ACCEPTED", label: t("status.accepted") },
                { status: "PENDING", label: t("status.pending") },
                { status: "COMPLETED", label: t("status.completed") },
                { status: "REJECTED", label: t("status.rejected") },
              ], t("status.other"))}
            />
          ) : null}
          {role === "ADMIN" ? (
            <Columns
              title={t("chart.orgs")}
              rows={buckets(orgs.map((row) => row.status || ""), [
                { status: "PENDING", label: t("status.pending") },
                { status: "APPROVED", label: t("status.approved") },
                { status: "REJECTED", label: t("status.rejected") },
              ], t("status.other"))}
            />
          ) : null}
          {seesStations ? (
            <Stacked
              title={t("chart.stations")}
              rows={[
                { label: t("status.stationOn"), value: stationCount, color: colors.primary },
                { label: t("status.stationOff"), value: stations.filter((row) => !row.isActive).length, color: colors.secondary },
              ]}
            />
          ) : null}
          {seesTransfers ? (
            <Chart
              title={t("chart.moves")}
              rows={buckets(moves.filter((row) => !String(row.code || "").startsWith("SAMPLE-")).map((row) => row.status), [
                { status: "PENDING", label: t("status.pending") },
                { status: "PREPARING", label: t("status.preparing") },
                { status: "IN_TRANSIT", label: t("status.transit") },
                { status: "RECEIVED", label: t("status.received") },
                { status: "COMPLETED", label: t("status.completed") },
                { status: "CANCELLED", label: t("status.cancelled") },
              ], t("status.other"))}
            />
          ) : null}
        </>
      ) : null}
    </OpsGate>
  );
}

export function StaffHome() {
  return (
    <Screen tab="home">
      <Title>Việc ở quầy</Title>
      <Body muted>Ca trực, phiếu tiếp nhận, kho trạm, việc được giao và điểm cộng thêm.</Body>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1, backgroundColor: colors.primary, justifyContent: "space-between" }}>
          <Icon name="receipt-long" size={24} color={colors.onPrimary} />
          <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.onPrimary }}>Lập phiếu nhận</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.primarySoft }}>
            Cân đo, kiểm định và ghi nhận vật phẩm tại quầy.
          </Text>
          <Button label="Lập phiếu" tone="coral" onPress={() => router.push("/receive/new")} />
        </Card>
        <Card style={{ flex: 1, justifyContent: "space-between" }}>
          <Icon name="schedule" size={24} color={colors.primary} />
          <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.ink }}>Ca trực trạm</Text>
          <Body muted>Xem ca sáng 08:00–14:00, ca chiều 14:00–20:00 và điểm danh.</Body>
          <Button label="Ca trực" tone="ghost" onPress={() => router.push("/shifts")} />
        </Card>
      </View>
      <Title>Công cụ quầy</Title>
      <View style={toolGrid}>
        {[
          { label: "Phiếu đã lập", icon: "receipt-long" as const, href: "/desk/intake" as const },
          { label: "Kho trạm", icon: "inventory" as const, href: "/desk/stock" as const },
          { label: "Điều chuyển", icon: "swap-horiz" as const, href: "/desk/transfers" as const },
          { label: "Giao hàng", icon: "local-shipping" as const, href: "/desk/relief" as const },
          { label: "Nhân sự & Việc", icon: "groups" as const, href: "/desk/crew" as const },
          { label: "Điểm & Chứng nhận", icon: "stars" as const, href: "/desk/rewards" as const },
        ].map((item) => (
          <View key={item.href} style={toolCell}>
            <Tap onPress={() => router.push(item.href)} accessibilityLabel={item.label} style={toolTile}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Icon name={item.icon} size={22} color={colors.primary} />
                <Icon name="chevron-right" size={18} color={colors.outline} />
              </View>
              <Text style={toolLabel}>{item.label}</Text>
            </Tap>
          </View>
        ))}
      </View>
    </Screen>
  );
}
