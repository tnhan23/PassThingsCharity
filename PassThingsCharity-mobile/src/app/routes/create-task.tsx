import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { Field, NumberPicker } from "@/components/form";
import { Body, Button, Card, Tap, Title } from "@/components/ui";
import { DateTimeField } from "@/components/DateTimeField";
import { DateField } from "@/components/DateField";
import { useSession } from "@/api/session";
import type { CampaignSummary, StationRow } from "@/api/types";
import { OpsGate, useJob } from "@/screens/ops/kit";
import { colors, fonts } from "@/theme";

const recruitmentStatuses = ["OPEN"] as const;

function dateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addCalendarDays(value: Date, days: number) {
  const result = dateOnly(value);
  result.setDate(result.getDate() + days);
  return result;
}

export default function CreateTaskRoute() {
  const { token } = useSession();
  const job = useJob();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [stationId, setStationId] = useState("");
  const [transferId, setTransferId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [recruitmentStatus, setRecruitmentStatus] = useState<(typeof recruitmentStatuses)[number]>("OPEN");
  const [requiredVolunteers, setRequiredVolunteers] = useState("5");
  const [volunteerDeadline, setVolunteerDeadline] = useState<Date | null>(null);
  const [rewardPoints, setRewardPoints] = useState("50");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState(false);
  const earliestStartDate = addCalendarDays(new Date(), 1);
  const earliestEndDate = startTime ? addCalendarDays(startTime, 3) : undefined;
  const earliestDeadlineDate = startTime ? addCalendarDays(startTime, 1) : undefined;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([
      backend.listCampaigns().then((data) => data.campaigns),
      backend.listStations(token).then((data) => data.data),
    ])
      .then(([campaignRows, stationRows]) => {
        if (cancelled) return;
        setCampaigns(campaignRows);
        setStations(stationRows);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof ApiError ? caught.message : "Không tải được chiến dịch hoặc trạm.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit() {
    setFormError("");

    const formData = {
      campaignId,
      stationId,
      transferId: transferId.trim(),
      title: title.trim(),
      description: description.trim(),
      startTime: startTime ? startTime.toISOString() : null,
      endTime: endTime ? endTime.toISOString() : null,
      recruitmentStatus,
      requiredVolunteers,
      volunteerDeadline: volunteerDeadline ? volunteerDeadline.toISOString() : null,
      rewardPoints,
    };
    console.log("[CreateTask] Form submission payload:", formData);

    if (!campaignId || !stationId || !title.trim()) {
      setFormError("Chọn chiến dịch, chọn trạm và nhập tên nhiệm vụ.");
      return;
    }
    if (!startTime || !endTime) {
      setFormError("Chọn ngày và giờ bắt đầu, đồng thời chọn ngày và giờ kết thúc.");
      return;
    }
    if (dateOnly(startTime).getTime() < earliestStartDate.getTime()) {
      setFormError("Ngày bắt đầu phải từ ngày mai trở đi.");
      return;
    }
    if (dateOnly(endTime).getTime() < addCalendarDays(startTime, 3).getTime()) {
      setFormError("Ngày kết thúc phải ít nhất 3 ngày sau ngày bắt đầu.");
      return;
    }

    const volunteers = Number(requiredVolunteers);
    const points = Number(rewardPoints);
    if (!Number.isInteger(volunteers) || volunteers < 1 || !Number.isInteger(points) || points < 10) {
      setFormError("Cần ít nhất 1 tình nguyện viên và điểm thưởng phải từ 10 trở lên.");
      return;
    }

    if (volunteerDeadline && dateOnly(volunteerDeadline).getTime() < addCalendarDays(startTime, 1).getTime()) {
      setFormError("Hạn đăng ký phải ít nhất 1 ngày sau ngày bắt đầu.");
      return;
    }
    if (startTime && endTime && startTime.getTime() >= endTime.getTime()) {
      setFormError("Thời gian bắt đầu phải trước thời gian kết thúc.");
      return;
    }

    const payload = {
      campaignId,
      stationId,
      ...(transferId.trim() ? { transferId: transferId.trim() } : {}),
      title: title.trim(),
      description: description.trim(),
      ...(startTime ? { startTime: startTime.toISOString() } : {}),
      ...(endTime ? { endTime: endTime.toISOString() } : {}),
      recruitmentStatus,
      requiredVolunteers: volunteers,
      ...(volunteerDeadline ? { volunteerDeadline: volunteerDeadline.toISOString() } : {}),
      rewardPoints: points,
    };

    console.log("[CreateTask] Posting task payload:", payload);

    const ok = await job.run((accessToken) => backend.createTask(accessToken, payload));
    if (ok) setCreated(true);
  }

  return (
    <OpsGate allowNonOperator>
      <Title>Tạo nhiệm vụ</Title>
      <Body muted>Điền thông tin để tạo một nhiệm vụ tình nguyện tại trạm.</Body>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Body>{error}</Body> : null}
      {job.note ? <Body>{job.note}</Body> : null}
      {formError ? <Body>{formError}</Body> : null}
      <Body muted>Quyền tạo nhiệm vụ vẫn do máy chủ kiểm tra; tài khoản không được phép có thể bị từ chối khi gửi.</Body>
      <>
        <Title>Chiến dịch</Title>
          {campaigns.map((campaign) => (
            <Tap key={campaign._id} onPress={() => setCampaignId(campaign._id)}>
              <Card style={campaignId === campaign._id ? { borderWidth: 1.5, borderColor: colors.primary } : undefined}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}>{campaign.title}</Text>
                <Body muted>{campaign._id}</Body>
              </Card>
            </Tap>
          ))}
          {campaigns.length === 0 && !loading ? <Body muted>Chưa có chiến dịch khả dụng.</Body> : null}

          <Title>Trạm</Title>
          {stations.map((station) => (
            <Tap key={station._id} onPress={() => setStationId(station._id)}>
              <Card style={stationId === station._id ? { borderWidth: 1.5, borderColor: colors.primary } : undefined}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}>{station.name}</Text>
                <Body muted>{`${station.address} · ${station._id}`}</Body>
              </Card>
            </Tap>
          ))}
          {stations.length === 0 && !loading ? <Body muted>Chưa có trạm khả dụng.</Body> : null}

          <Field label="Mã điều phối (transferId, không bắt buộc)" value={transferId} onChangeText={setTransferId} />
          <Field label="Tên nhiệm vụ (title)" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
          <Field label="Mô tả (description)" value={description} onChangeText={setDescription} multiline autoCapitalize="sentences" />

          <Body muted>Bắt đầu từ ngày mai trở đi; kết thúc phải cách ngày bắt đầu ít nhất 3 ngày.</Body>
          <DateTimeField
            label="Bắt đầu (startTime)"
            value={startTime}
            minimumDate={earliestStartDate}
            onChange={(nextStart) => {
              setStartTime(nextStart);
              if (!nextStart || (volunteerDeadline && dateOnly(volunteerDeadline) < addCalendarDays(nextStart, 1))) {
                setVolunteerDeadline(null);
              }
              if (nextStart && endTime && dateOnly(endTime) < addCalendarDays(nextStart, 3)) {
                setEndTime(null);
              }
            }}
          />
          <DateTimeField
            label="Kết thúc (endTime)"
            value={endTime}
            minimumDate={earliestEndDate}
            onChange={setEndTime}
          />

          <Title>Trạng thái tuyển tình nguyện viên</Title>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {recruitmentStatuses.map((status) => (
              <Button
                key={status}
                label={status}
                tone={recruitmentStatus === status ? "primary" : "ghost"}
                onPress={() => setRecruitmentStatus(status)}
              />
            ))}
          </View>

          <NumberPicker label="Số tình nguyện viên cần (requiredVolunteers)" value={requiredVolunteers} minimum={1} onChange={setRequiredVolunteers} />
          <Body muted>Hạn đăng ký là tùy chọn; ngày hạn phải ít nhất 1 ngày sau ngày bắt đầu.</Body>
          <DateField
            label="Hạn đăng ký (volunteerDeadline)"
            value={volunteerDeadline}
            minimumDate={earliestDeadlineDate}
            disabled={!startTime}
            onChange={(nextDeadline) => setVolunteerDeadline(nextDeadline)}
          />
          <NumberPicker label="Điểm thưởng (rewardPoints)" value={rewardPoints} minimum={10} onChange={setRewardPoints} />
          <Button
            label={job.busy ? "Đang tạo..." : "Tạo nhiệm vụ"}
            disabled={job.busy || loading || Boolean(error) || created}
            onPress={() => void submit()}
          />
          {created ? <Button label="Quay lại nhân sự" tone="ghost" onPress={() => router.replace("/routes/workforce")} /> : null}
      </>
    </OpsGate>
  );
}
