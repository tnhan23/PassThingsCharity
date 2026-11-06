import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { backend } from "@/api/backend";
import { useSession } from "@/api/session";
import { Body, Button, Pill, Tap, Title } from "@/components/ui";
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

function accountState(status?: string) {
  if (status === "banned") return "Đã khóa";
  if (status === "inactive") return "Ngưng";
  return "Đang dùng";
}

export function AccountsScreen() {
  const { user } = useSession();
  const people = useRows((token) => backend.listUsers(token).then((data) => data.data as Row[]));
  const job = useJob();
  const [picked, setPicked] = useState("");
  const [bucket, setBucket] = useState<"ALL" | "active" | "banned">("ALL");
  const shown = (people.rows ?? []).filter((row) => bucket === "ALL" || row.status === bucket);

  return (
    <OpsGate>
      <Title>Người dùng</Title>
      <Note text={people.error || job.note} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pill label="Tất cả" active={bucket === "ALL"} onPress={() => setBucket("ALL")} />
        <Pill label="Đang dùng" active={bucket === "active"} onPress={() => setBucket("active")} />
        <Pill label="Đã khóa" active={bucket === "banned"} onPress={() => setBucket("banned")} />
      </View>
      {people.rows === null ? <Body muted>Đang tải danh sách.</Body> : null}
      {people.rows && shown.length === 0 ? <Body muted>Không có tài khoản trong nhóm này.</Body> : null}
      {shown.length ? (
        <View style={styles.list}>
          {shown.map((row, index) => {
            const selected = row._id === picked;
            const self = String(row._id) === String(user?.id || "");
            const locked = row.role === "ADMIN";
            return (
              <View key={row._id} style={index > 0 ? styles.rowLine : null}>
                <Tap
                  onPress={() => setPicked(selected ? "" : row._id)}
                  accessibilityLabel={row.fullName || row.username || "Tài khoản"}
                  style={[styles.row, selected ? styles.rowOn : null]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.name}>{row.fullName || row.username || "Chưa có tên"}</Text>
                    <Text style={styles.meta}>{row.username || "Chưa có tên đăng nhập"}</Text>
                    <Text style={styles.meta}>{`${roleText[row.role || ""] || "Chưa rõ vai"}  ${row.phone || "Chưa có số"}`}</Text>
                  </View>
                  <Text style={[styles.state, row.status === "banned" ? { color: colors.error } : null]}>{accountState(row.status)}</Text>
                </Tap>
                {selected ? (
                  <View style={{ gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
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

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLine: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  rowOn: { backgroundColor: colors.primarySoft },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  state: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
});
