import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as Location from "expo-location";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { pickImage } from "@/api/images";
import { donorLabel, formatDay, itemName, itemUnit } from "@/api/labels";
import { useSession } from "@/api/session";
import type { CampaignDetail, StationRow, TaskRow } from "@/api/types";
import { Screen } from "@/components/chrome";
import { Badge, Body, Button, Card, Eyebrow, Icon, Meter, Photo, StatRow, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

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
  const [routeNote, setRouteNote] = useState("");
  const [findingRoute, setFindingRoute] = useState(false);
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

  async function findRoute() {
    if (!station || findingRoute) return;
    setFindingRoute(true);
    setRouteNote("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setRouteNote(permission.canAskAgain
          ? "Để tìm đường, hãy cho phép ứng dụng truy cập vị trí."
          : "Quyền vị trí đang tắt. Hãy bật quyền vị trí cho ứng dụng trong Cài đặt.");
        return;
      }

      let timeout: ReturnType<typeof setTimeout> | undefined;
      let position: Location.LocationObject;
      try {
        position = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error("Không lấy được vị trí sau 15 giây. Hãy bật dịch vụ định vị rồi thử lại.")), 15000);
          }),
        ]);
      } finally {
        if (timeout) clearTimeout(timeout);
      }

      router.push(
        `/stations/map?station=${encodeURIComponent(station._id)}&route=1&originLat=${position.coords.latitude}&originLng=${position.coords.longitude}`,
      );
    } catch (caught) {
      setRouteNote(caught instanceof Error ? caught.message : "Không lấy được vị trí hiện tại.");
    } finally {
      setFindingRoute(false);
    }
  }

  const active = campaigns.filter((detail) => detail.campaign.status === "ACTIVE" || detail.campaign.status === "PUBLISHED");
  const hours = station.openingTime || station.closingTime
    ? `${station.openingTime || "?"} đến ${station.closingTime || "?"}`
    : "Chưa có giờ mở cửa.";
  const hasCoordinates =
    station.latitude !== undefined &&
    station.latitude !== null &&
    station.longitude !== undefined &&
    station.longitude !== null &&
    Number.isFinite(Number(station.latitude)) &&
    Number.isFinite(Number(station.longitude));

  return (
    <Screen tab="stations">
      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, padding: 12 }}>
        {station.imageUrl ? (
          <Photo uri={station.imageUrl} height={210} radius={16} />
        ) : (
          <View style={{ height: 150, borderRadius: 16, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <Icon name="place" size={44} color={colors.primary} />
            <Text style={{ marginTop: 8, fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>Chưa có ảnh trạm</Text>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Eyebrow>TRẠM TIẾP NHẬN</Eyebrow>
          <Badge
            label={station.isActive ? "Đang hoạt động" : "Chưa kích hoạt"}
            tone={station.isActive ? "primary" : "neutral"}
            icon={station.isActive ? "check-circle" : "schedule"}
          />
        </View>
        <Title>{station.name}</Title>
        <View style={{ gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.card }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
            <Icon name="place" size={19} color={colors.primary} />
            <Body>{station.address || "Chưa có địa chỉ."}</Body>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <Icon name="schedule" size={19} color={colors.primary} />
            <Body muted>{hours}</Body>
          </View>
        </View>
      </Card>
      <StatRow
        items={[
          { label: "Chiến dịch", value: active.length, unit: "chiến dịch", tone: "primary" },
          { label: "Công việc", value: tasks.length, unit: "việc", tone: "coral" },
        ]}
      />
      {hasCoordinates ? (
        <Button
          label={findingRoute ? "Đang lấy vị trí..." : "Tìm đường trên bản đồ"}
          disabled={findingRoute}
          tone="coral"
          icon="near-me"
          onPress={() => void findRoute()}
        />
      ) : (
        <Card style={{ backgroundColor: colors.surfaceLow }}>
          <Body muted>Trạm chưa có tọa độ để tìm đường.</Body>
        </Card>
      )}
      {routeNote ? (
        <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }}>
          <Body>{routeNote}</Body>
        </Card>
      ) : null}
      {canEditPhoto ? (
        <Button
          label={uploading ? "Đang tải ảnh..." : station.imageUrl ? "Đổi ảnh trạm" : "Tải ảnh trạm"}
          tone="ghost"
          icon="add-a-photo"
          disabled={uploading}
          onPress={() => void changePhoto()}
        />
      ) : null}
      {photoNote ? (
        <Card style={{ backgroundColor: photoNote.startsWith("Đã lưu") ? colors.primarySoft : colors.errorSoft }}>
          <Body>{photoNote}</Body>
        </Card>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <Icon name="volunteer-activism" size={21} color={colors.primary} />
        <Title>Chiến dịch tại trạm</Title>
      </View>
      {active.length === 0 ? (
        <Card style={{ backgroundColor: colors.surfaceLow }}>
          <Body muted>Trạm này chưa gắn chiến dịch đang diễn ra.</Body>
        </Card>
      ) : null}
      {active.map((detail) => (
        <Card key={detail.campaign._id} style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
          <Badge label={donorLabel(detail.campaign)} tone="primary" icon="campaign" />
          <Title>{detail.campaign.title}</Title>
          <Body muted>{`${formatDay(detail.campaign.startDate)} đến ${formatDay(detail.campaign.endDate)}`}</Body>
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
        </Card>
      ))}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <Icon name="work-outline" size={21} color={colors.secondary} />
        <Title>Việc tại trạm</Title>
      </View>
      {tasks.length === 0 ? (
        <Card style={{ backgroundColor: colors.surfaceLow }}>
          <Body muted>Chưa có việc được giao cho trạm này.</Body>
        </Card>
      ) : null}
      {tasks.map((task) => (
        <Card key={task._id} style={{ backgroundColor: colors.coralSoft, borderColor: colors.coralSoft }}>
          {task.imageUrl ? <Photo uri={task.imageUrl} height={150} radius={14} /> : null}
          <Badge
            label={task.recruitmentStatus === "OPEN" ? "Đang tuyển" : task.status}
            tone={task.recruitmentStatus === "OPEN" ? "coral" : "neutral"}
            icon="work-outline"
          />
          <Title>{task.title}</Title>
          {task.description ? <Body>{task.description}</Body> : null}
          <Body muted>{typeof task.rewardPoints === "number" ? `${task.rewardPoints} điểm khi hoàn thành.` : "Điểm cộng lúc check-out."}</Body>
        </Card>
      ))}
    </Screen>
  );
}
