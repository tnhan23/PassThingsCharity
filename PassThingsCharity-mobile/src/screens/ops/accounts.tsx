import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { backend } from "@/api/backend";
import { useSession } from "@/api/session";
import { Body, Button, Icon, Pill, Tap, Title } from "@/components/ui";
import { Field } from "@/components/form";
import { Note, OpsGate, useJob, useRows, type Row } from "@/screens/ops/kit";
import { colors, fonts } from "@/theme";

const roleText: Record<string, string> = {
  ADMIN: "Quản trị",
  ORG_MANAGER: "Quản lý tổ chức",
  STATION_MANAGER: "Trưởng trạm",
  STAFF: "Nhân viên",
  VOLUNTEER: "Tình nguyện viên",
  USER: "Người dùng",
};

const roleFilters = [
  { value: "ADMIN", label: roleText.ADMIN },
  { value: "STATION_MANAGER", label: roleText.STATION_MANAGER },
  { value: "STAFF", label: roleText.STAFF },
  { value: "VOLUNTEER", label: roleText.VOLUNTEER },
  { value: "USER", label: roleText.USER },
] as const;

function accountState(status?: string) {
  if (status === "banned") return "Đã khóa";
  return "Đang dùng";
}

export function AccountsScreen() {
  const { user } = useSession();
  const people = useRows((token) => backend.listUsers(token).then((data) => data.data as Row[]));
  const job = useJob();
  const [picked, setPicked] = useState("");
  const [bucket, setBucket] = useState<"ALL" | "active" | "banned">("ALL");
  const [role, setRole] = useState<string>("ALL");
  const [accountSearch, setAccountSearch] = useState("");
  const shown = (people.rows ?? []).filter(
    (row) => {
      const query = accountSearch.trim().toLowerCase();
      return (
        (row.status === "active" || row.status === "banned") &&
        (bucket === "ALL" || row.status === bucket) &&
        (role === "ALL" || row.role === role) &&
        ((row.email || "").toLowerCase().includes(query) || (row.phone || "").toLowerCase().includes(query))
      );
    },
  );

  return (
    <OpsGate>
      <Title>Người dùng</Title>
      <Note text={people.error || job.note} />
      <Field
        label="Tìm theo email hoặc số điện thoại"
        value={accountSearch}
        onChangeText={setAccountSearch}
        keyboardType="default"
        showSoftInputOnFocus
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pill label="Tất cả" active={bucket === "ALL"} onPress={() => setBucket("ALL")} />
        <Pill label="Đang dùng" active={bucket === "active"} onPress={() => setBucket("active")} />
        <Pill label="Đã khóa" active={bucket === "banned"} onPress={() => setBucket("banned")} />
      </View>
      <View style={styles.roleFilters}>
        <Pill label="Tất cả vai trò" active={role === "ALL"} onPress={() => setRole("ALL")} />
        {roleFilters.map((filter) => (
          <Pill
            key={filter.value}
            label={filter.label}
            active={role === filter.value}
            onPress={() => setRole(filter.value)}
          />
        ))}
      </View>
      {people.rows === null ? <Body muted>Đang tải danh sách.</Body> : null}
      {people.rows && shown.length === 0 ? (
        <Body muted>{accountSearch.trim() ? "Không tìm thấy tài khoản phù hợp." : "Không có tài khoản trong nhóm này."}</Body>
      ) : null}
      {shown.length ? (
        <View style={styles.list}>
          {shown.map((row) => {
            const selected = row._id === picked;
            const self = String(row._id) === String(user?.id || "");
            const locked = row.role === "ADMIN";
            return (
              <View key={row._id} style={[styles.card, selected ? styles.cardOn : null]}>
                <Tap
                  onPress={() => setPicked(selected ? "" : row._id)}
                  accessibilityLabel={`${row.fullName || row.username || "Tài khoản"}, ${accountState(row.status)}, ${row.email || "Chưa có email"}`}
                  style={styles.row}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.name}>{row.fullName || row.username || "Chưa có tên"}</Text>
                    <Text style={styles.meta}>{row.email || "Chưa có email"}</Text>
                  </View>
                  <View style={styles.summaryEnd}>
                    <Text style={[styles.state, statusColor(row.status)]}>{accountState(row.status)}</Text>
                    <Icon name={selected ? "expand-less" : "expand-more"} size={22} color={colors.primary} />
                  </View>
                </Tap>
                {selected ? (
                  <View style={styles.details}>
                    <Detail label="Họ tên" value={row.fullName || "Chưa cập nhật"} />
                    <Detail label="Email" value={row.email || "Chưa cập nhật"} />
                    <Detail label="Tên đăng nhập" value={row.username || "Chưa cập nhật"} />
                    <Detail label="Số điện thoại" value={row.phone || "Chưa cập nhật"} />
                    <Detail label="Vai trò" value={roleText[row.role || ""] || "Chưa rõ vai trò"} />
                    <Detail label="Trạng thái" value={accountState(row.status)} />
                    <Detail label="ID tài khoản" value={row._id} />
                    {self || locked ? <Body muted>Tài khoản quản trị và tài khoản đang đăng nhập không khóa tại đây.</Body> : null}
                    {!self && !locked && row.status !== "banned" ? (
                      <Button
                        label="Khóa vĩnh viễn"
                        tone="danger"
                        onPress={() => void job.run((token) => backend.setUserStatus(token, row._id, "banned")).then((ok) => ok && people.reload())}
                      />
                    ) : null}
                    {!self && !locked && row.status === "banned" ? (
                      <Button
                        label="Mở khóa"
                        onPress={() => void job.run((token) => backend.setUserStatus(token, row._id, "active")).then((ok) => ok && people.reload())}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </OpsGate>
  );
}

function statusColor(status?: string) {
  if (status === "banned") return { color: colors.error };
  return { color: colors.primary };
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  roleFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  list: {
    gap: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: "hidden",
  },
  cardOn: { borderColor: colors.primary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  details: {
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  detailValue: { flex: 1, textAlign: "right", fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  summaryEnd: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  state: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
});
