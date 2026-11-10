import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { pickImage } from "@/api/images";
import { donorLabel, formatDay, itemName, itemUnit } from "@/api/labels";
import { useSession } from "@/api/session";
import type { CampaignDetail, StationRow, TaskRow } from "@/api/types";
import { Screen } from "@/components/chrome";
import { Body, Button, Card, Eyebrow, Meter, Photo, Title } from "@/components/ui";
import { colors } from "@/theme";

function hasStation(detail: CampaignDetail, stationId: string) {
  return detail.stations.some((station) => station?._id === stationId);
}

export default function StationDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const stationId = typeof id === "string" ? id : "";
  const { token, user } = useSession();
  const [station, setStation] = useState<StationRow | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignDetail[] | null>(null);
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [problem, setProblem] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const canEditPhoto = user?.role === "ADMIN" || user?.role === "ORG_MANAGER" || user?.role === "STATION_MANAGER";

  useEffect(() => {
    if (!token || !stationId) return;
    let cancelled = false;
    setProblem("");
    setStation(null);
    setCampaigns(null);
    setTasks(null);
    Promise.all([
      backend.getStation(token, stationId),
      backend.listCampaigns(),
      backend.listTasks(token, stationId),
    ])
      .then(async ([place, list, work]) => {
        const details = await Promise.all(
          list.campaigns.map((campaign) => backend.getCampaign(campaign._id).catch(() => null)),
        );
        if (cancelled) return;
        setStation(place.station);
        setCampaigns(details.filter((detail): detail is CampaignDetail => Boolean(detail && hasStation(detail, stationId))));
        setTasks(work.data ?? []);
      })
      .catch((caught) => {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Không mở được thông tin trạm.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, stationId]);

  if (!token) {
    return (
      <Screen tab="stations">
        <Title>Chi tiết trạm</Title>
        <Body>Đăng nhập để xem chiến dịch và món đồ của trạm này.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  if (problem) {
    return (
      <Screen tab="stations">
        <Title>Không mở được trạm</Title>
        <Body>{problem}</Body>
        <Button label="Quay lại danh sách" onPress={() => router.replace("/stations/list")} />
      </Screen>
    );
  }

  if (!station || !campaigns || !tasks) {
    return (
      <Screen tab="stations">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang tải thông tin trạm</Title>
          <Body muted>Chiến dịch và số lượng hiện sau khi máy chủ trả về.</Body>
        </Card>
      </Screen>
    );
  }

  async function changePhoto() {
    if (!token || !stationId) return;
    setUploading(true);
    setPhotoNote("");
    try {
      const file = await pickImage();
      if (!file) return;
      const uploaded = await backend.uploadStationImage(token, file);
      if (!uploaded.imageUrl) {
        setPhotoNote("Máy chủ không trả đường dẫn ảnh.");
        return;
      }
      await backend.updateStation(token, stationId, { imageUrl: uploaded.imageUrl });
      setStation((current) => (current ? { ...current, imageUrl: uploaded.imageUrl } : current));
      setPhotoNote("Đã lưu ảnh trạm.");
    } catch (caught) {
      setPhotoNote(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Không tải được ảnh trạm.");
    } finally {
      setUploading(false);
    }
  }

  const active = campaigns.filter((detail) => detail.campaign.status === "ACTIVE" || detail.campaign.status === "PUBLISHED");
  const hours = station.openingTime || station.closingTime
    ? `${station.openingTime || "?"} đến ${station.closingTime || "?"}`
    : "Chưa có giờ mở cửa.";

  return (
    <Screen tab="stations">
      <Eyebrow>{station.isActive ? "Đang mở" : "Chưa kích hoạt"}</Eyebrow>
      <Title>{station.name}</Title>
      {station.imageUrl ? <Photo uri={station.imageUrl} height={200} radius={18} /> : <Body muted>Trạm chưa có ảnh.</Body>}
      <Body>{station.address}</Body>
      <Body muted>{hours}</Body>
      {canEditPhoto ? (
        <Button label={uploading ? "Đang tải ảnh..." : station.imageUrl ? "Đổi ảnh trạm" : "Tải ảnh trạm"} disabled={uploading} onPress={() => void changePhoto()} />
      ) : null}
      {photoNote ? <Body>{photoNote}</Body> : null}
      <Title>Chiến dịch tại trạm</Title>
      {active.length === 0 ? <Body>Trạm này chưa gắn chiến dịch đang diễn ra.</Body> : null}
      {active.map((detail) => (
        <Card key={detail.campaign._id}>
          <Eyebrow>{`${donorLabel(detail.campaign)} · ${formatDay(detail.campaign.startDate)} đến ${formatDay(detail.campaign.endDate)}`}</Eyebrow>
          <Title>{detail.campaign.title}</Title>
          {detail.campaign.description ? <Body>{detail.campaign.description}</Body> : null}
          {detail.items.length === 0 ? <Body muted>Chiến dịch chưa khai báo món đồ.</Body> : null}
          {detail.items.map((item) => {
            const current = Number(item.currentQuantity) || 0;
            const target = Number(item.targetQuantity) || 0;
            const unit = itemUnit(item);
            return (
              <Meter
                key={item._id}
                value={current}
                max={Math.max(target, current, 1)}
                unit={unit}
                label={`${itemName(item)}: đã nhận ${current} ${unit}, cần ${target} ${unit}.`}
              />
            );
          })}
          <Button label="Mở chiến dịch" tone="ghost" onPress={() => router.push(`/campaign?id=${detail.campaign._id}`)} />
        </Card>
      ))}
      <Title>Việc tại trạm</Title>
      {tasks.length === 0 ? <Body>Chưa có việc được giao cho trạm này.</Body> : null}
      {tasks.map((task) => (
        <Card key={task._id}>
          {task.imageUrl ? <Photo uri={task.imageUrl} height={140} radius={12} /> : null}
          <Eyebrow>{task.recruitmentStatus === "OPEN" ? "Đang tuyển" : task.status}</Eyebrow>
          <Title>{task.title}</Title>
          <Body muted>{typeof task.rewardPoints === "number" ? `${task.rewardPoints} điểm khi hoàn thành.` : "Điểm cộng lúc check-out."}</Body>
        </Card>
      ))}
    </Screen>
  );
}
