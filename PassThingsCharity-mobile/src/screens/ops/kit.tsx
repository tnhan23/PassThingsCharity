import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ApiError } from "@/api/client";
import { resultText } from "@/api/backend";
import { isOperator, useSession } from "@/api/session";
import { Screen } from "@/components/chrome";
import { Field } from "@/components/form";
import { Body, Button, Card, Tap, Title } from "@/components/ui";
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
  ownerId?: string;
  phone?: string;
  recipientName?: string;
  recruitmentStatus?: string;
  campaignId?: { title?: string; _id?: string } | string;
  stationId?: { name?: string } | string;
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

const campaignNext: Record<string, string[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function nextCampaignStatuses(status: string) {
  return campaignNext[status] ?? [];
}

export function RoleNote() {
  const role = useRole();
  if (role) return <Body muted>{`Vai trò đang đăng nhập: ${role}. Nút ghi dữ liệu chỉ hiện khi server cho phép vai trò này.`}</Body>;
  return <Body>Đăng nhập lại để app nhận vai trò. Nút ghi dữ liệu sẽ hiện theo quyền server sau lần đăng nhập đó.</Body>;
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

  return { token, rows, error, reload: () => setStamp((value) => value + 1) };
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
  return (
    <Card>
      <Body>{text}</Body>
    </Card>
  );
}

export function PickList({
  rows,
  selected,
  onPick,
  detail,
}: {
  rows: Row[] | null;
  selected: string;
  onPick: (id: string) => void;
  detail: (row: Row) => string;
}) {
  if (!rows) {
    return (
      <Card>
        <ActivityIndicator color={colors.primary} />
        <Body muted>Đang tải danh sách.</Body>
      </Card>
    );
  }
  if (rows.length === 0) return <Body>Chưa có dòng nào cho tài khoản này.</Body>;
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row) => (
        <Tap key={row._id} onPress={() => onPick(row._id)}>
          <Card style={selected === row._id ? { borderWidth: 1.5, borderColor: colors.primary } : undefined}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}>{labelOf(row)}</Text>
            <Body muted>{detail(row)}</Body>
          </Card>
        </Tap>
      ))}
    </View>
  );
}

export function Units({ value, onChange }: { value: string; onChange: (unit: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {["KG", "PAIR", "BOX", "PACK", "PIECE"].map((unit) => (
        <Button key={unit} label={unit} tone={value === unit ? "primary" : "ghost"} onPress={() => onChange(unit)} />
      ))}
    </View>
  );
}

export function TextField({ label, value, onChangeText, secure }: { label: string; value: string; onChangeText: (value: string) => void; secure?: boolean }) {
  return <Field label={label} value={value} onChangeText={onChangeText} secure={secure} />;
}
