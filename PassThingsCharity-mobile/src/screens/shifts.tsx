import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ApiError } from "@/api/client";
import { backend } from "@/api/backend";
import type { ShiftScheduleRow, StationRow } from "@/api/types";
import { useSession } from "@/api/session";
import { Screen } from "@/components/chrome";
import { Field } from "@/components/form";
import { Body, Button, Card, Tap, Title } from "@/components/ui";
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
  const hours = value.startTime && value.endTime ? ` ${value.startTime}–${value.endTime}` : "";
  return `${value.name || "Ca"}${hours}`;
}

export function ShiftsScreen() {
  const { token, user } = useSession();
  const role = user?.role && shiftRoles.includes(user.role) ? user.role : "";
  const canWrite = role === "STATION_MANAGER" || role === "ORG_MANAGER";
  const [stations, setStations] = useState<StationRow[] | null>(null);
  const [stationId, setStationId] = useState("");
  const [templates, setTemplates] = useState<{ _id: string; name: string; startTime: string; endTime: string }[]>([]);
  const [staff, setStaff] = useState<{ _id: string; fullName?: string; username?: string }[]>([]);
  const [schedules, setSchedules] = useState<ShiftScheduleRow[] | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [templateId, setTemplateId] = useState("");
  const [staffId, setStaffId] = useState("");

  useEffect(() => {
    if (!token || !role) return;
    backend.listStations(token)
      .then((data) => setStations(data.data))
      .catch((reason: unknown) => {
        setStations([]);
        setError(reason instanceof ApiError ? reason.message : "Không tải được trạm.");
      });
  }, [token, role]);

  useEffect(() => {
    if (!token || !stationId) return;
    setError("");
    setSchedules(null);
    Promise.all([
      backend.listShiftTemplates(token, stationId),
      backend.listShiftSchedules(token, stationId),
      canWrite ? backend.listStationStaff(token, stationId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ])
      .then(([templateData, scheduleData, staffData]) => {
        setTemplates(templateData.data);
        setSchedules(scheduleData.data);
        setStaff(staffData.data);
        setTemplateId(templateData.data[0]?._id || "");
        setStaffId(staffData.data[0]?._id || "");
      })
      .catch((reason: unknown) => {
        setSchedules([]);
        setError(reason instanceof ApiError ? reason.message : "Không tải được ca trực.");
      });
  }, [token, stationId, canWrite]);

  async function refresh() {
    if (!token || !stationId) return;
    const data = await backend.listShiftSchedules(token, stationId);
    setSchedules(data.data);
  }

  async function createTemplate() {
    if (!token || !stationId) return;
    setNote("");
    try {
      const data = await backend.createShiftTemplate(token, stationId, { name, startTime, endTime, requiredStaff: 1 });
      setNote(data.message);
      const next = await backend.listShiftTemplates(token, stationId);
      setTemplates(next.data);
      setName("");
    } catch (reason) {
      setNote(reason instanceof ApiError ? reason.message : "Không tạo được ca mẫu.");
    }
  }

  async function assign() {
    if (!token || !stationId || !templateId) return;
    setNote("");
    try {
      const data = await backend.createShiftSchedule(token, stationId, {
        templateId,
        date,
        ...(staffId ? { staffId } : {}),
      });
      setNote(data.message);
      await refresh();
    } catch (reason) {
      setNote(reason instanceof ApiError ? reason.message : "Không phân được ca.");
    }
  }

  async function punch(id: string, kind: "in" | "out") {
    if (!token) return;
    setNote("");
    try {
      const data = kind === "in" ? await backend.checkInShift(token, id) : await backend.checkOutShift(token, id);
      setNote(data.message);
      await refresh();
    } catch (reason) {
      setNote(reason instanceof ApiError ? reason.message : "Không điểm danh được.");
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
      <Body muted>Điểm danh chỉ ghi giờ vào và giờ ra. Server không tính công và không cộng điểm.</Body>
      {note ? <Body>{note}</Body> : null}
      {error ? <Body>{error}</Body> : null}
      {stations === null ? <ActivityIndicator color={colors.primary} /> : null}
      {stations && stations.length === 0 ? <Body>Chưa có trạm nào tài khoản này được xem.</Body> : null}
      <View style={{ gap: 8 }}>
        {stations?.map((item) => (
          <Tap key={item._id} onPress={() => setStationId(item._id)}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: item._id === stationId ? colors.primary : colors.ink }}>{item.name}</Text>
          </Tap>
        ))}
      </View>
      {station ? <Body muted>{station.address || "Trạm chưa có địa chỉ."}</Body> : null}
      {schedules === null && stationId ? <ActivityIndicator color={colors.primary} /> : null}
      {schedules && schedules.length === 0 ? <Body>Trạm này chưa có lịch phân ca.</Body> : null}
      {schedules?.map((item) => {
        const mine = personId(item.staffId) === user?.id;
        return (
          <Card key={item._id}>
            <Title>{templateName(item.templateId)}</Title>
            <Body>{`${item.date} · ${personName(item.staffId)}`}</Body>
            <Body muted>{item.status}</Body>
            {role === "STAFF" && mine && item.status === "SCHEDULED" ? <Button label="Vào ca" onPress={() => punch(item._id, "in")} /> : null}
            {role === "STAFF" && mine && item.status === "IN_PROGRESS" ? <Button label="Tan ca" tone="ghost" onPress={() => punch(item._id, "out")} /> : null}
          </Card>
        );
      })}
      {canWrite && stationId ? (
        <Card>
          <Title>Tạo ca mẫu</Title>
          <Field label="Tên ca" value={name} onChangeText={setName} />
          <Field label="Giờ bắt đầu HH:mm" value={startTime} onChangeText={setStartTime} />
          <Field label="Giờ kết thúc HH:mm" value={endTime} onChangeText={setEndTime} />
          <Button label="Lưu ca mẫu" onPress={createTemplate} />
          <Title>Phân ca</Title>
          <Field label="Ngày YYYY-MM-DD" value={date} onChangeText={setDate} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>Ca mẫu</Text>
          {templates.map((item) => (
            <Tap key={item._id} onPress={() => setTemplateId(item._id)}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: item._id === templateId ? colors.primary : colors.ink }}>{`${item.name} ${item.startTime}–${item.endTime}`}</Text>
            </Tap>
          ))}
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>Nhân viên</Text>
          {staff.length === 0 ? <Body muted>Chưa lấy được danh sách nhân viên của trạm. Không thể gán người.</Body> : null}
          {staff.map((item) => (
            <Tap key={item._id} onPress={() => setStaffId(item._id)}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: item._id === staffId ? colors.primary : colors.ink }}>{item.fullName || item.username || item._id}</Text>
            </Tap>
          ))}
          <Button label="Gán ca" onPress={assign} />
        </Card>
      ) : null}
    </Screen>
  );
}
