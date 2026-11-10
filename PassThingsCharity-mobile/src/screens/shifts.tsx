import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ApiError } from "@/api/client";
import { backend } from "@/api/backend";
import type { ShiftScheduleRow, StationRow } from "@/api/types";
import { useSession } from "@/api/session";
import { useToast } from "@/api/toast";
import { Screen } from "@/components/chrome";
import { StationProofScan, StationQrCard, type StationProof } from "@/components/station-proof";
import { Badge, Body, Button, Card, Icon, Pill, StatRow, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

const shiftRoles = ["STATION_MANAGER", "ORG_MANAGER", "STAFF"];

function personId(value: ShiftScheduleRow["staffId"]) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || "";
}

function personName(value: ShiftScheduleRow["staffId"]) {
  if (!value) return "Ca trống";
  if (typeof value === "string") return value;
  return value.fullName || value.username || "Nhân viên";
}

function templateName(value: ShiftScheduleRow["templateId"]) {
  if (!value || typeof value === "string") return "Ca";
  return value.name || "Ca";
}

function templateHours(value: ShiftScheduleRow["templateId"]) {
  if (!value || typeof value === "string" || !value.startTime || !value.endTime) return "Chưa có giờ";
  return `${value.startTime}-${value.endTime}`;
}

function localDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const weekDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function comingWeek() {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return { key: localDate(day), short: weekDays[day.getDay()], number: String(day.getDate()) };
  });
}

function shiftState(status: string) {
  if (status === "SCHEDULED") return "Chờ vào ca";
  if (status === "IN_PROGRESS") return "Đang trong ca";
  if (status === "COMPLETED") return "Đã tan ca";
  return status;
}

export function ShiftsScreen() {
  const { token, user } = useSession();
  const toast = useToast();
  const role = user?.role && shiftRoles.includes(user.role) ? user.role : "";
  const canWrite = role === "STATION_MANAGER" || role === "ORG_MANAGER";
  const staffStations = user?.stations;
  const [stations, setStations] = useState<StationRow[] | null>(null);
  const [stationId, setStationId] = useState("");
  const [templates, setTemplates] = useState<{ _id: string; name: string; startTime: string; endTime: string }[]>([]);
  const [staff, setStaff] = useState<{ _id: string; fullName?: string; username?: string }[]>([]);
  const [schedules, setSchedules] = useState<ShiftScheduleRow[] | null>(null);
  const [error, setError] = useState("");
  const [staffError, setStaffError] = useState("");
  const [pending, setPending] = useState<{ id: string; kind: "in" | "out" } | null>(null);
  const [dayKey, setDayKey] = useState(localDate(new Date()));
  const [templateId, setTemplateId] = useState("");
  const [staffIds, setStaffIds] = useState<string[]>([]);

  useEffect(() => {
    if (!token || !role) return;
    if (role === "STAFF") {
      const mine = staffStations ?? [];
      setStations(mine);
      setStationId((current) => current || mine[0]?._id || "");
      return;
    }
    backend.listStations(token)
      .then((data) => {
        setStations(data.data);
        setStationId((current) =>
          data.data.some((station) => station._id === current)
            ? current
            : data.data[0]?._id || "",
        );
      })
      .catch((reason: unknown) => {
        setStations([]);
        setStationId("");
        setError(reason instanceof ApiError ? reason.message : "Không tải được trạm.");
      });
  }, [token, role, staffStations]);

  useEffect(() => {
    if (!token || !role) return;
    backend.listShiftTemplates(token)
      .then((data) => {
        setTemplates(data.data);
        setTemplateId((current) => current || data.data[0]?._id || "");
      })
      .catch((reason: unknown) => {
        setError(reason instanceof ApiError ? reason.message : "Không tải được ca sáng và ca chiều.");
      });
  }, [token, role]);

  useEffect(() => {
    if (!token || !stationId) return;
    setError("");
    setStaffError("");
    setSchedules(null);
    backend.listShiftSchedules(token, stationId)
      .then((data) => setSchedules(data.data))
      .catch((reason: unknown) => {
        setSchedules([]);
        setError(reason instanceof ApiError ? reason.message : "Không tải được ca trực.");
      });
    if (!canWrite) {
      setStaff([]);
      return;
    }
    backend.listStationStaff(token, stationId)
      .then((data) => setStaff(data.data))
      .catch((reason: unknown) => {
        setStaff([]);
        setStaffError(reason instanceof ApiError ? reason.message : "Không tải được nhân viên của trạm.");
      });
  }, [token, stationId, canWrite]);

  async function refresh() {
    if (!token || !stationId) return;
    const data = await backend.listShiftSchedules(token, stationId);
    setSchedules(data.data);
  }

  function toggleStaff(id: string) {
    setStaffIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function assign() {
    if (!token || !stationId || !templateId || staffIds.length === 0) return;
    try {
      const data = await backend.createShiftSchedule(token, stationId, {
        templateId,
        date: dayKey,
        staffIds,
        requiredStaff: staffIds.length,
      });
      toast.show(data.message, "success");
      setStaffIds([]);
      await refresh();
    } catch (reason) {
      toast.show(reason instanceof ApiError ? reason.message : "Không phân được ca.", "error");
    }
  }

  async function punch(id: string, kind: "in" | "out", proof: StationProof) {
    if (!token) return;
    try {
      const data = kind === "in" ? await backend.checkInShift(token, id, proof) : await backend.checkOutShift(token, id, proof);
      toast.show(data.message, "success");
      await refresh();
    } catch (reason) {
      toast.show(reason instanceof ApiError ? reason.message : "Không điểm danh được.", "error");
    }
  }

  if (!token) {
    return (
      <Screen tab="stations">
        <Title>Ca trực</Title>
        <Body>Đăng nhập bằng tài khoản được giao việc tại trạm.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  if (!role) {
    return (
      <Screen tab="stations">
        <Title>Ca trực</Title>
        <Body>Server chỉ cho quản lý trạm, quản lý tổ chức và nhân viên xem ca. Tài khoản này không thuộc các vai trò đó.</Body>
      </Screen>
    );
  }

  const station = stations?.find((item) => item._id === stationId);

  return (
    <Screen tab="stations">
      <Title>Ca trực</Title>
      {role === "STAFF" ? <Body muted>Bảy ngày tới. Chọn một ngày để xem ca của bạn.</Body> : <Body muted>Điểm danh chỉ ghi giờ vào và giờ ra. Server không tính công và không cộng điểm.</Body>}
      {pending ? (
        <StationProofScan
          title={pending.kind === "in" ? "Vào ca" : "Tan ca"}
          onCancel={() => setPending(null)}
          onDone={(proof) => {
            const next = pending;
            setPending(null);
            void punch(next.id, next.kind, proof);
          }}
        />
      ) : null}
      {canWrite && token && stationId ? <StationQrCard token={token} stationId={stationId} /> : null}
      {error ? <Body>{error}</Body> : null}
      {stations === null ? <ActivityIndicator color={colors.primary} /> : null}
      {role === "STAFF" && stations && stations.length === 0 ? <Body>Bạn chưa được gán vào trạm nào. Đăng nhập lại nếu vừa được phân trạm.</Body> : null}
      {role === "STATION_MANAGER" && stations && stations.length === 0 ? <Body>Bạn chưa được gán làm trưởng trạm. Vui lòng liên hệ quản trị viên để kiểm tra phân công.</Body> : null}
      {role !== "STAFF" && role !== "STATION_MANAGER" && stations && stations.length === 0 ? <Body>Chưa có trạm nào tài khoản này được xem.</Body> : null}
      {stations && stations.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {stations.map((item) => (
            <Pill key={item._id} label={item.name} active={item._id === stationId} onPress={() => setStationId(item._id)} />
          ))}
        </View>
      ) : null}
      {station ? <Body muted>{station.address || "Trạm chưa có địa chỉ."}</Body> : null}
      {schedules === null && stationId ? <ActivityIndicator color={colors.primary} /> : null}
      {role !== "STAFF" && schedules && schedules.length === 0 ? <Body>Trạm này chưa có lịch phân ca.</Body> : null}
      {role === "STAFF" && stationId ? (() => {
        const week = comingWeek();
        const mine = (schedules ?? []).filter((item) => personId(item.staffId) === user?.id);
        const selected = mine
          .filter((item) => item.date.slice(0, 10) === dayKey)
          .sort((a, b) => templateHours(a.templateId).localeCompare(templateHours(b.templateId)));
        const chosen = week.find((day) => day.key === dayKey) ?? week[0];
        return (
          <View style={{ gap: 12 }}>
            <StatRow
              items={[
                { label: "Ca tuần này", value: mine.length, unit: "ca", tone: "primary" },
                { label: "Hôm đang chọn", value: selected.length, unit: "ca", tone: "coral" },
              ]}
            />
            <View style={{ flexDirection: "row", gap: 6 }}>
              {week.map((day) => {
                const on = day.key === chosen.key;
                const has = mine.some((item) => item.date.slice(0, 10) === day.key);
                return (
                  <Tap
                    key={day.key}
                    accessibilityLabel={day.short}
                    onPress={() => setDayKey(day.key)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      gap: 2,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: on ? colors.primary : colors.card,
                      borderWidth: 1,
                      borderColor: on ? colors.primary : colors.hairline,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: on ? colors.onPrimary : colors.muted }}>{day.short}</Text>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: on ? colors.onPrimary : colors.ink, fontVariant: ["tabular-nums"] }}>{day.number}</Text>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: has ? (on ? colors.onPrimary : colors.secondary) : "transparent" }} />
                  </Tap>
                );
              })}
            </View>
            {mine.length === 0 ? <Body muted>Tuần này chưa có ca được giao.</Body> : null}
            {mine.length > 0 && selected.length === 0 ? <Body muted>Ngày này chưa có ca.</Body> : null}
            {selected.map((item) => (
              <View key={item._id} style={{ flexDirection: "row", gap: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, padding: 14 }}>
                <View style={{ width: 4, borderRadius: 2, backgroundColor: item.status === "COMPLETED" ? colors.line : colors.secondary }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.ink, fontVariant: ["tabular-nums"] }}>{templateHours(item.templateId)}</Text>
                    <Badge
                      label={shiftState(item.status)}
                      tone={item.status === "IN_PROGRESS" ? "coral" : item.status === "COMPLETED" ? "primary" : "warning"}
                    />
                  </View>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }}>{templateName(item.templateId)}</Text>
                  {item.status === "SCHEDULED" ? <Button label="Vào ca" onPress={() => setPending({ id: item._id, kind: "in" })} /> : null}
                  {item.status === "IN_PROGRESS" ? <Button label="Tan ca" tone="ghost" onPress={() => setPending({ id: item._id, kind: "out" })} /> : null}
                </View>
              </View>
            ))}
          </View>
        );
      })() : null}
      {role !== "STAFF" && stationId ? (() => {
        const week = comingWeek();
        const chosen = week.find((day) => day.key === dayKey) ?? week[0];
        const dayRows = (schedules ?? []).filter((item) => item.date.slice(0, 10) === chosen.key);
        return (
          <View style={{ gap: 12 }}>
            <StatRow
              items={[
                { label: "Tổng lịch trạm", value: (schedules ?? []).length, unit: "lượt", tone: "ink" },
                { label: "Ngày đang chọn", value: dayRows.length, unit: "người", tone: "primary" },
              ]}
            />
            <View style={{ flexDirection: "row", gap: 6 }}>
              {week.map((day) => {
                const on = day.key === chosen.key;
                const has = (schedules ?? []).some((item) => item.date.slice(0, 10) === day.key);
                return (
                  <Tap
                    key={day.key}
                    accessibilityLabel={day.short}
                    onPress={() => setDayKey(day.key)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      gap: 2,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: on ? colors.primary : colors.card,
                      borderWidth: 1,
                      borderColor: on ? colors.primary : colors.hairline,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: on ? colors.onPrimary : colors.muted }}>{day.short}</Text>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: on ? colors.onPrimary : colors.ink, fontVariant: ["tabular-nums"] }}>{day.number}</Text>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: has ? (on ? colors.onPrimary : colors.secondary) : "transparent" }} />
                  </Tap>
                );
              })}
            </View>
            {dayRows.length === 0 ? <Body muted>Ngày này chưa có người trực.</Body> : null}
            {dayRows.map((item) => (
              <Card key={item._id}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.ink, fontVariant: ["tabular-nums"] }}>
                    {`${templateName(item.templateId)} · ${templateHours(item.templateId)}`}
                  </Text>
                  <Badge
                    label={shiftState(item.status)}
                    tone={item.status === "IN_PROGRESS" ? "coral" : item.status === "COMPLETED" ? "primary" : "warning"}
                  />
                </View>
                <Body>{personName(item.staffId)}</Body>
              </Card>
            ))}
          </View>
        );
      })() : null}
      {canWrite && stationId ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Title>Gán người vào ca</Title>
            {staffIds.length > 0 ? <Badge label={`Đã chọn ${staffIds.length}`} tone="primary" /> : null}
          </View>
          <Body muted>Chỉ có ca sáng 08:00–14:00 và ca chiều 14:00–20:00. Chọn ngày ở trên, chọn ca, rồi chọn nhân viên.</Body>
          <View style={{ gap: 8 }}>
            {templates.map((item) => {
              const on = item._id === templateId;
              return (
                <Tap
                  key={item._id}
                  onPress={() => setTemplateId(item._id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: on ? colors.primarySoft : colors.surface,
                    borderWidth: 1.5,
                    borderColor: on ? colors.primary : colors.hairline,
                  }}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: on ? colors.primary : colors.ink, fontVariant: ["tabular-nums"] }}>
                    {`${item.name} · ${item.startTime}–${item.endTime}`}
                  </Text>
                  <Icon name={on ? "radio-button-checked" : "radio-button-unchecked"} size={20} color={on ? colors.primary : colors.outline} />
                </Tap>
              );
            })}
          </View>
          {staffError ? <Body>{staffError}</Body> : null}
          {staff.length === 0 && !staffError ? <Body muted>Trạm này chưa có nhân viên để gán.</Body> : null}
          {staff.length > 0 ? <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>Chọn nhân viên trực:</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {staff.map((item) => {
              const on = staffIds.includes(item._id);
              return (
                <Pill
                  key={item._id}
                  label={item.fullName || item.username || "Nhân viên"}
                  active={on}
                  onPress={() => toggleStaff(item._id)}
                />
              );
            })}
          </View>
          <Button label={staffIds.length ? `Gán ${staffIds.length} người vào ca` : "Chọn nhân viên"} onPress={assign} />
        </Card>
      ) : null}
    </Screen>
  );
}
