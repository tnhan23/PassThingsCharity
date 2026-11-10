import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
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
  const stations = useRows(async (token) => {
    const { data } = await backend.listStations(token);
    const assignmentsByStation = await Promise.all(
      data.map((station) => backend.listStationStaffAssignments(token, station._id)),
    );
    return data.map((station, index) => ({
      ...station,
      staffUserIds: assignmentsByStation[index].data.map((assignment) => assignment.userId),
    })) as Row[];
  });
  const job = useJob();
  const hasFocused = useRef(false);
  const [picked, setPicked] = useState("");
  const [managerTarget, setManagerTarget] = useState("");
  const [staffTarget, setStaffTarget] = useState("");
  const [bucket, setBucket] = useState<"ALL" | "active" | "banned">("ALL");
  const [role, setRole] = useState<string>("ALL");
  const [accountSearch, setAccountSearch] = useState("");
  const [page, setPage] = useState(0);
  const assignedManagerIds = new Set(
    (stations.rows ?? []).flatMap((station) => {
      const managerId = typeof station.managerId === "string" ? station.managerId : station.managerId?._id;
      return managerId ? [managerId] : [];
    }),
  );
  const unassignedStations = (stations.rows ?? []).filter((station) => !station.managerId);
  const activeStations = (stations.rows ?? []).filter((station) => station.isActive);

  useFocusEffect(useCallback(() => {
    if (!hasFocused.current) {
      hasFocused.current = true;
      return;
    }
    stations.reload();
  }, [stations.reload]));

  const shown = (people.rows ?? []).filter(
    (row) => {
      const query = accountSearch.trim().toLowerCase();
      return (
        (row.status === "active" || row.status === "banned") &&
        (bucket === "ALL" || row.status === bucket) &&
        (role === "ALL" || row.role === role) &&
        (role !== "STATION_MANAGER" || assignedManagerIds.has(row._id)) &&
        ((row.email || "").toLowerCase().includes(query) || (row.phone || "").toLowerCase().includes(query))
      );
    },
  );
  const pageCount = Math.ceil(shown.length / 5);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const pageAccounts = shown.slice(currentPage * 5, currentPage * 5 + 5);

  return (
    <OpsGate>
      <Title>Người dùng</Title>
      <Note text={people.error || stations.error || job.note} />
      <Field
        label="Tìm theo email hoặc số điện thoại"
        value={accountSearch}
        onChangeText={(value) => {
          setAccountSearch(value);
          setPage(0);
          setPicked("");
        }}
        keyboardType="default"
        showSoftInputOnFocus
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pill label="Tất cả" active={bucket === "ALL"} onPress={() => { setBucket("ALL"); setPage(0); setPicked(""); }} />
        <Pill label="Đang dùng" active={bucket === "active"} onPress={() => { setBucket("active"); setPage(0); setPicked(""); }} />
        <Pill label="Đã khóa" active={bucket === "banned"} onPress={() => { setBucket("banned"); setPage(0); setPicked(""); }} />
      </View>
      <View style={styles.roleFilters}>
        <Pill label="Tất cả vai trò" active={role === "ALL"} onPress={() => { setRole("ALL"); setPage(0); setPicked(""); }} />
        {roleFilters.map((filter) => (
          <Pill
            key={filter.value}
            label={filter.label}
            active={role === filter.value}
            onPress={() => { setRole(filter.value); setPage(0); setPicked(""); }}
          />
        ))}
      </View>
      {people.rows === null ? <Body muted>Đang tải danh sách.</Body> : null}
      {people.rows && shown.length === 0 ? (
        <Body muted>{accountSearch.trim() ? "Không tìm thấy tài khoản phù hợp." : "Không có tài khoản trong nhóm này."}</Body>
      ) : null}
      {shown.length ? (
        <View style={styles.list}>
          {pageAccounts.map((row) => {
            const selected = row._id === picked;
            const self = String(row._id) === String(user?.id || "");
            const locked = row.role === "ADMIN";
            const identifier = row.email?.trim();
            const assignedStations = row.role === "STATION_MANAGER"
              ? (stations.rows ?? []).filter((station) => {
                  const managerId = typeof station.managerId === "string" ? station.managerId : station.managerId?._id;
                  return managerId === row._id;
                })
              : [];
            const canAssignManager =
              row.status === "active" &&
              Boolean(identifier) &&
              (row.role === "USER" ||
                (row.role === "STATION_MANAGER" && stations.rows !== null && assignedStations.length === 0));
            const canAssignStaff =
              row.status === "active" &&
              Boolean(identifier) &&
              (row.role === "USER" || row.role === "STAFF");
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
                    {row.role === "STATION_MANAGER" ? (
                      <Detail
                        label="Trạm được phân công"
                        value={assignedStations.length
                          ? assignedStations.map((station) => `${station.name}${station.address ? ` (${station.address})` : ""}`).join(", ")
                          : "Chưa được phân công trạm"}
                      />
                    ) : null}
                    {self || locked ? <Body muted>Tài khoản quản trị và tài khoản đang đăng nhập không khóa tại đây.</Body> : null}
                    {canAssignManager ? (
                      <>
                        <Button
                          label={managerTarget === row._id ? "Hủy bổ nhiệm" : "Bổ nhiệm làm trưởng trạm"}
                          tone="ghost"
                          onPress={() => setManagerTarget(managerTarget === row._id ? "" : row._id)}
                        />
                        {managerTarget === row._id ? (
                          <View style={styles.stationChoices}>
                            <Body muted>Chọn trạm để bổ nhiệm người dùng này.</Body>
                            {stations.rows === null ? <Body muted>Đang tải danh sách trạm.</Body> : null}
                            {stations.rows && unassignedStations.length === 0 ? <Body muted>Không còn trạm nào chưa có trưởng trạm.</Body> : null}
                            {unassignedStations.map((station) => (
                              <Button
                                key={station._id}
                                label={`${station.name}${station.address ? ` · ${station.address}` : ""}`}
                                tone="ghost"
                                disabled={job.busy}
                                onPress={() => {
                                  if (!identifier) return;
                                  void job.run((token) =>
                                    backend.assignStationManagerToStation(token, station._id, identifier),
                                  ).then((ok) => {
                                    if (ok) {
                                      setManagerTarget("");
                                      people.reload();
                                      stations.reload();
                                    }
                                  });
                                }}
                              />
                            ))}
                          </View>
                        ) : null}
                      </>
                    ) : null}
                    {canAssignStaff ? (
                      <>
                        <Button
                          label={staffTarget === row._id ? "Hủy gán nhân viên" : "Gán làm nhân viên trạm"}
                          tone="ghost"
                          onPress={() => setStaffTarget(staffTarget === row._id ? "" : row._id)}
                        />
                        {staffTarget === row._id ? (
                          <View style={styles.stationChoices}>
                            <Body muted>Chọn trạm đang hoạt động để gán tài khoản này làm nhân viên.</Body>
                            {stations.rows === null ? <Body muted>Đang tải danh sách trạm.</Body> : null}
                            {stations.rows && activeStations.length === 0 ? <Body muted>Chưa có trạm nào đang hoạt động; vẫn có thể gỡ phân công hiện có bên dưới.</Body> : null}
                            {(stations.rows ?? [])
                              .filter((station) => station.isActive || station.staffUserIds?.includes(row._id))
                              .map((station) => (
                              <Button
                                key={station._id}
                                label={`${station.staffUserIds?.includes(row._id) ? "Gỡ khỏi" : "Gán vào"} ${station.name}${station.address ? ` · ${station.address}` : ""}`}
                                tone={station.staffUserIds?.includes(row._id) ? "danger" : "ghost"}
                                disabled={job.busy}
                                onPress={() => {
                                  if (!identifier) return;
                                  void job.run((token) =>
                                    station.staffUserIds?.includes(row._id)
                                      ? backend.removeStaffAssignment(token, station._id, row._id)
                                      : backend.assignStaffByIdentifier(token, station._id, identifier),
                                  ).then((ok) => {
                                    if (ok) {
                                      setStaffTarget("");
                                      people.reload();
                                      stations.reload();
                                    }
                                  });
                                }}
                              />
                            ))}
                          </View>
                        ) : null}
                      </>
                    ) : null}
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
      {pageCount > 1 ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Button
            label="Trước"
            tone="ghost"
            icon="chevron-left"
            disabled={currentPage === 0}
            onPress={() => { setPage(Math.max(0, currentPage - 1)); setPicked(""); }}
          />
          <Text style={{ flex: 1, textAlign: "center", fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>
            {`Trang ${currentPage + 1} / ${pageCount} · ${shown.length} tài khoản`}
          </Text>
          <Button
            label="Tiếp"
            tone="ghost"
            icon="chevron-right"
            disabled={currentPage >= pageCount - 1}
            onPress={() => { setPage(Math.min(pageCount - 1, currentPage + 1)); setPicked(""); }}
          />
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
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    overflow: "hidden",
  },
  cardOn: { borderColor: colors.primary, borderWidth: 2 },
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
    borderTopColor: colors.line,
  },
  stationChoices: {
    gap: 8,
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
