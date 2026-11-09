import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ApiError } from "@/api/client";
import { resultText } from "@/api/backend";
import { isOperator, useSession } from "@/api/session";
import { Screen } from "@/components/chrome";
import { Field } from "@/components/form";
import { Badge, Body, Button, Card, Icon, Pill, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

export type Row = {
  _id: string;
  name?: string;
  title?: string;
  code?: string;
  status?: string;
  address?: string;
  isVerified?: boolean;
  isActive?: boolean;
  unit?: string;
  fullName?: string;
  username?: string;
  role?: string;
  ownerId?: string;
  phone?: string;
  email?: string;
  description?: string;
  operatingArea?: string;
  idCardNumber?: string;
  evidenceImageUrls?: string[];
  rejectionReason?: string;
  recipientName?: string;
  recruitmentStatus?: string;
  slots?: { total?: number; approved?: number; pending?: number; remaining?: number; isFull?: boolean };
  campaignId?: { title?: string; _id?: string } | string;
  stationId?: { _id?: string; name?: string; address?: string } | string;
  fromStationId?: { name?: string } | string;
  toStationId?: { name?: string } | string;
};

export function labelOf(row: Row) {
  return row.title || row.name || row.code || row.fullName || row.username || "Chưa có tên";
}

export function refName(value: Row["campaignId"]) {
  if (!value || typeof value === "string") return "";
  return value.title || "";
}

const knownRoles = ["ADMIN", "ORG_MANAGER", "STATION_MANAGER", "STAFF", "VOLUNTEER", "USER"];

export function useRole() {
  const { user } = useSession();
  return user?.role && knownRoles.includes(user.role) ? user.role : "";
}

export function can(role: string, allowed: string[]) {
  return role !== "" && allowed.includes(role);
}

export const deskAccess = {
  orgs: ["ADMIN", "ORG_MANAGER", "STATION_MANAGER"],
  stations: ["ADMIN", "ORG_MANAGER", "STATION_MANAGER"],
  catalog: ["ADMIN", "ORG_MANAGER", "STATION_MANAGER"],
  campaigns: ["ADMIN", "ORG_MANAGER", "STATION_MANAGER"],
  intake: ["ADMIN", "ORG_MANAGER", "STATION_MANAGER", "STAFF"],
  users: ["ADMIN"],
  alerts: ["ADMIN"],
  transfers: ["ADMIN", "STATION_MANAGER", "STAFF"],
  relief: ["ADMIN", "ORG_MANAGER", "STATION_MANAGER", "STAFF"],
  crew: ["ADMIN", "STATION_MANAGER", "STAFF"],
  rewards: ["ADMIN", "ORG_MANAGER", "STATION_MANAGER", "STAFF"],
  stock: ["ADMIN", "STATION_MANAGER", "STAFF"],
} as const;

const campaignNext: Record<string, string[]> = {
  DRAFT: ["ACTIVE", "CANCELLED"],
  PUBLISHED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function nextCampaignStatuses(status: string) {
  return campaignNext[status] ?? [];
}

export function RoleNote() {
  return null;
}

export function OpsGate({ children }: { children: ReactNode }) {
  const { token, user } = useSession();
  if (!token) {
    return (
      <Screen tab="profile">
        <Title>Vận hành</Title>
        <Body>Đăng nhập bằng tài khoản được giao việc. Server quyết định tài khoản này được duyệt, tạo hay chỉ được xem.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
      </Screen>
    );
  }
  if (!isOperator(user?.role)) {
    return (
      <Screen tab="profile">
        <Title>Tài khoản này không vận hành</Title>
        <Body>Người dùng thường xem chiến dịch, trạm và điểm của mình. Tiếp nhận, điều chuyển và giao hàng dành cho nhân viên và quản lý.</Body>
        <Button label="Về trang chủ" onPress={() => router.replace("/")} />
      </Screen>
    );
  }
  return <Screen tab="profile">{children}</Screen>;
}

export function useRows(load: (token: string) => Promise<Row[]>) {
  const { token } = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [stamp, setStamp] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  const reload = useCallback(() => setStamp((value) => value + 1), []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setError("");
    loadRef.current(token)
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((caught) => {
        if (!cancelled) {
          setRows([]);
          setError(caught instanceof ApiError ? caught.message : "Không tải được danh sách.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, stamp]);

  return { token, rows, error, reload };
}

export function useJob() {
  const { token } = useSession();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  async function run(job: (token: string) => Promise<unknown>) {
    if (!token) {
      setNote("Đăng nhập trước.");
      return false;
    }
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setNote("");
    try {
      const data = await job(token);
      setNote(resultText(data));
      return true;
    } catch (caught) {
      setNote(caught instanceof Error ? caught.message : "Máy chủ từ chối.");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return { token, note, busy, run };
}

export function Note({ text }: { text: string }) {
  if (!text) return null;
  const isErr = /không|lỗi|chưa|từ chối|thiếu|sai/i.test(text);
  return (
    <Card
      style={{
        backgroundColor: isErr ? colors.errorSoft : colors.primarySoft,
        borderColor: isErr ? "#f3b8b3" : colors.hairline,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icon name={isErr ? "error-outline" : "check-circle"} size={20} color={isErr ? colors.error : colors.primary} />
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.medium,
            fontSize: 14,
            lineHeight: 20,
            color: isErr ? colors.error : colors.primary,
          }}
        >
          {text}
        </Text>
      </View>
    </Card>
  );
}

export function Fold({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Card style={open ? { borderColor: colors.primary, borderWidth: 1.5 } : undefined}>
      <Tap onPress={() => setOpen((value) => !value)} accessibilityLabel={title}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 38, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Icon name={open ? "remove-circle-outline" : "add-circle-outline"} size={20} color={colors.primary} />
            <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>{title}</Text>
          </View>
          <Badge label={open ? "Thu gọn" : "Mở"} tone={open ? "primary" : "neutral"} />
        </View>
      </Tap>
      {open ? (
        <View style={{ gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.hairline }}>
          {children}
        </View>
      ) : null}
    </Card>
  );
}

export function PickList({
  rows,
  selected,
  onPick,
  detail,
  panel,
}: {
  rows: Row[] | null;
  selected: string;
  onPick: (id: string) => void;
  detail: (row: Row) => string;
  panel?: (row: Row) => ReactNode;
}) {
  if (!rows) {
    return (
      <Card>
        <ActivityIndicator color={colors.primary} />
        <Body muted>Đang tải danh sách.</Body>
      </Card>
    );
  }
  if (rows.length === 0) {
    return (
      <Card>
        <Body muted>Chưa có dòng nào cho tài khoản này.</Body>
      </Card>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {rows.map((row) => {
        const open = selected === row._id;
        const subtitle = detail(row);
        return (
          <Card key={row._id} style={open ? { borderWidth: 1.5, borderColor: colors.primary } : undefined}>
            <Tap onPress={() => onPick(open ? "" : row._id)} accessibilityLabel={labelOf(row)}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>{labelOf(row)}</Text>
                  {subtitle ? (
                    <Text
                      style={{
                        fontFamily: fonts.regular,
                        fontSize: 13,
                        lineHeight: 18,
                        color: colors.muted,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <Icon name={open ? "expand-less" : "expand-more"} size={22} color={colors.primary} />
              </View>
            </Tap>
            {open && panel ? (
              <View style={{ gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                {panel(row)}
              </View>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}

export function Units({ value, onChange }: { value: string; onChange: (unit: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {["KG", "PAIR", "BOX", "PACK", "PIECE"].map((unit) => (
        <Pill key={unit} label={unit} active={value === unit} onPress={() => onChange(unit)} />
      ))}
    </View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  secure,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad" | "decimal-pad";
}) {
  return <Field label={label} value={value} onChangeText={onChangeText} secure={secure} keyboardType={keyboardType} />;
}
