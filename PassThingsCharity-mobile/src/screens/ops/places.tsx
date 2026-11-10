import { useFocusEffect } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { createElement, useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import * as Location from "expo-location";
import { backend } from "@/api/backend";
import { donorLabel } from "@/api/labels";
import { ApiError } from "@/api/client";
import { pickImage } from "@/api/images";
import { Body, Button, Card, Photo, Pill, StatRow, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";
import { can, Fold, nextCampaignStatuses, Note, OpsGate, PickList, RoleNote, TextField, Units, useJob, useRole, useRows, type Row } from "@/screens/ops/kit";

const AppleMaps = Platform.OS === "ios" ? (require("expo-maps") as typeof import("expo-maps")).AppleMaps : null;
const NativeWebView = Platform.OS === "android"
  ? (require("react-native-webview") as typeof import("react-native-webview")).WebView
  : null;

function campaignDateValue(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function campaignDateFromInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addCampaignDays(date: Date, days: number) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

function stationPlaceMapHtml(latitude: number | null, longitude: number | null) {
  const center = latitude !== null && longitude !== null ? [latitude, longitude] : [10.7769, 106.7009];
  const zoom = latitude !== null && longitude !== null ? 16 : 13;
  const markerLine = latitude !== null && longitude !== null
    ? `let marker = L.marker(${JSON.stringify(center)}).addTo(map);`
    : "let marker = null;";
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>html,body,#map{height:100%;width:100%;margin:0}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map("map").setView(${JSON.stringify(center)}, ${zoom});
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    const streets = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 });
    const relief = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 });
    let tileErrors = 0;
    streets.on("tileerror", () => {
      tileErrors += 1;
      if (tileErrors < 3 || map.hasLayer(relief)) return;
      map.removeLayer(streets);
      relief.addTo(map);
    });
    streets.addTo(map);
    ${markerLine}
    map.on("click", (event) => {
      const { lat, lng } = event.latlng;
      if (marker) marker.setLatLng(event.latlng);
      else marker = L.marker(event.latlng).addTo(map);
      window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
    });
    setTimeout(() => map.invalidateSize(), 200);
  </script>
</body>
</html>`;
}

function campaignDateValue(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function campaignDateFromInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addCampaignDays(date: Date, days: number) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

function StationPlaceMap({
  latitude,
  longitude,
  onPick,
}: {
  latitude: string;
  longitude: string;
  onPick: (latitude: string, longitude: string) => void;
}) {
  const hasCoordinates = Boolean(latitude.trim() && longitude.trim());
  const lat = hasCoordinates ? Number(latitude) : null;
  const lng = hasCoordinates ? Number(longitude) : null;
  const picked = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);
  const androidMapHtml = useRef(stationPlaceMapHtml(picked ? lat : null, picked ? lng : null)).current;
  const camera = useRef(picked && lat !== null && lng !== null
    ? { coordinates: { latitude: lat, longitude: lng }, zoom: 16 }
    : { coordinates: { latitude: 10.7769, longitude: 106.7009 }, zoom: 13 }).current;
  if (Platform.OS === "android" && NativeWebView) {
    return (
      <View style={{ height: 220, borderRadius: 14, overflow: "hidden" }}>
        <NativeWebView
          originWhitelist={["*"]}
          source={{ html: androidMapHtml, baseUrl: "https://tile.openstreetmap.org/" }}
          userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          javaScriptEnabled
          scrollEnabled={false}
          onMessage={(event) => {
            try {
              const point: unknown = JSON.parse(event.nativeEvent.data);
              if (!point || typeof point !== "object" || !("latitude" in point) || !("longitude" in point)) return;
              if (typeof point.latitude !== "number" || typeof point.longitude !== "number") return;
              if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;
              onPick(point.latitude.toFixed(6), point.longitude.toFixed(6));
            } catch {
              return;
            }
          }}
          style={{ flex: 1, backgroundColor: colors.surfaceContainer }}
        />
      </View>
    );
  }
  if (!AppleMaps) return null;
  return (
    <View style={{ height: 220, borderRadius: 14, overflow: "hidden" }}>
      <AppleMaps.View
        style={{ flex: 1, width: "100%" }}
        cameraPosition={camera}
        markers={picked ? [{ id: "new-station", title: "Vị trí trạm", coordinates: { latitude: lat, longitude: lng }, tintColor: colors.primary }] : []}
        onMapClick={(event) => {
          const nextLat = event.coordinates.latitude;
          const nextLng = event.coordinates.longitude;
          if (typeof nextLat !== "number" || typeof nextLng !== "number" || !Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
          onPick(nextLat.toFixed(6), nextLng.toFixed(6));
        }}
        colorScheme={AppleMaps.MapColorScheme.LIGHT}
      />
    </View>
  );
}

function orgState(row: Row) {
  if (row.status === "REJECTED") return "Bị từ chối";
  if (row.status === "APPROVED" || row.isVerified) return "Đã duyệt";
  return "Chờ duyệt";
}

function orgDetail(row: Row) {
  return `${orgState(row)}${row.code ? ` · ${row.code}` : ""}`;
}

function orgBucket(row: Row) {
  if (row.status === "REJECTED") return "REJECTED";
  if (row.status === "APPROVED" || row.isVerified) return "APPROVED";
  return "PENDING";
}

export function OrgScreen() {
  const list = useRows((token) => backend.listOrganizations(token).then((data) => data.data as Row[]));
  const job = useJob();
  const role = useRole();
  const [picked, setPicked] = useState("");
  const [reason, setReason] = useState("");
  const [bucket, setBucket] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">(role === "ADMIN" ? "PENDING" : "ALL");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const allRows = list.rows ?? [];
  const counts = {
    pending: allRows.filter((row) => orgBucket(row) === "PENDING").length,
    approved: allRows.filter((row) => orgBucket(row) === "APPROVED").length,
    rejected: allRows.filter((row) => orgBucket(row) === "REJECTED").length,
  };
  const shown = allRows.filter((row) => bucket === "ALL" || orgBucket(row) === bucket);

  return (
    <OpsGate>
      <Title>Tổ chức</Title>
      <RoleNote />
      <Note text={list.error || job.note} />
      {list.rows ? (
        <StatRow
          items={[
            { label: "Chờ duyệt", value: counts.pending, unit: "đơn", tone: "coral" },
            { label: "Đã duyệt", value: counts.approved, unit: "hội", tone: "primary" },
            { label: "Từ chối", value: counts.rejected, unit: "đơn", tone: "ink" },
          ]}
        />
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pill label={`Chờ duyệt (${counts.pending})`} active={bucket === "PENDING"} onPress={() => setBucket("PENDING")} />
        <Pill label={`Đã duyệt (${counts.approved})`} active={bucket === "APPROVED"} onPress={() => setBucket("APPROVED")} />
        <Pill label={`Bị từ chối (${counts.rejected})`} active={bucket === "REJECTED"} onPress={() => setBucket("REJECTED")} />
        <Pill label={`Tất cả (${allRows.length})`} active={bucket === "ALL"} onPress={() => setBucket("ALL")} />
      </ScrollView>
      <PickList
        rows={list.rows ? shown : null}
        selected={picked}
        onPick={setPicked}
        detail={orgDetail}
        panel={(row) => can(role, ["ADMIN"]) ? (
          <>
            {row.address ? <Body>{row.address}</Body> : null}
            {row.phone ? <Body muted>{row.phone}</Body> : null}
            {row.email ? <Body muted>{row.email}</Body> : null}
            {row.operatingArea ? <Body muted>{row.operatingArea}</Body> : null}
            {row.idCardNumber ? <Body muted>{`CCCD ${row.idCardNumber}`}</Body> : null}
            {row.description ? <Body>{row.description}</Body> : null}
            {row.evidenceImageUrls?.length ? (
              <View style={{ gap: 8 }}>
                <Body muted>{`Ảnh minh chứng (${row.evidenceImageUrls.length})`}</Body>
                {row.evidenceImageUrls.map((url) => (
                  <Photo key={url} uri={url} height={160} radius={14} />
                ))}
              </View>
            ) : (
              <Body muted>Chưa có ảnh minh chứng.</Body>
            )}
            {row.rejectionReason ? <Body>{row.rejectionReason}</Body> : null}
            {orgBucket(row) === "PENDING" ? (
              <>
                <Button label={job.busy ? "Đang gửi" : "Duyệt tổ chức này"} onPress={() => void job.run((token) => backend.approveOrganization(token, row._id)).then((ok) => ok && list.reload())} />
                <TextField label="Lý do từ chối" value={reason} onChangeText={setReason} />
                <Button label="Từ chối tổ chức này" tone="danger" onPress={() => void job.run((token) => backend.rejectOrganization(token, row._id, reason.trim())).then((ok) => ok && list.reload())} />
              </>
            ) : null}
          </>
        ) : null}
      />
      {role === "USER" ? <Title>Tổ chức mới</Title> : null}
      {role === "USER" ? (
        <View style={{ gap: 8 }}>
          <TextField label="Tên" value={name} onChangeText={setName} />
          <TextField label="Mã" value={code} onChangeText={setCode} />
          <TextField label="Địa chỉ" value={address} onChangeText={setAddress} />
          <Button
            label="Tạo tổ chức"
            onPress={() => void job.run((token) => backend.createOrganization(token, { name: name.trim(), code: code.trim(), address: address.trim() })).then((ok) => {
              if (!ok) return;
              setName("");
              setCode("");
              setAddress("");
              list.reload();
            })}
          />
        </View>
      ) : null}
    </OpsGate>
  );
}

export function StationScreen() {
  const stations = useRows((token) => backend.listStations(token).then((data) => data.data as Row[]));
  const orgs = useRows((token) => backend.listOrganizations(token).then((data) => data.data as Row[]));
  const job = useJob();
  const approveStationJob = useJob();
  const createStationJob = useJob();
  const role = useRole();
  const hasFocused = useRef(false);
  const [picked, setPicked] = useState("");
  const [stationFilter, setStationFilter] = useState<"ALL" | "PENDING" | "APPROVED">(
    role === "ADMIN" ? "PENDING" : "ALL",
  );
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLatitude, setEditLatitude] = useState("");
  const [editLongitude, setEditLongitude] = useState("");
  const [editOpen, setEditOpen] = useState("");
  const [editClose, setEditClose] = useState("");
  const [staffError, setStaffError] = useState("");
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState("");
  const [mapFocusKey, setMapFocusKey] = useState(0);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const canEditPhoto = role === "ADMIN" || role === "ORG_MANAGER" || role === "STATION_MANAGER";
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [staff, setStaff] = useState<Row[] | null>(null);
  const [staffId, setStaffId] = useState("");
  const visibleStations = stations.rows?.filter((station) => (
    stationFilter === "ALL" || (stationFilter === "APPROVED" ? station.isActive : !station.isActive)
  )) ?? null;

  useFocusEffect(useCallback(() => {
    if (role !== "ADMIN") return;
    if (!hasFocused.current) {
      hasFocused.current = true;
      return;
    }
    stations.reload();
  }, [role, stations.reload]));

  useEffect(() => {
    const selected = stations.rows?.find((row) => row._id === picked);
    setEditName(selected?.name || "");
    setEditAddress(selected?.address || "");
    setEditLatitude(selected?.latitude != null ? String(selected.latitude) : "");
    setEditLongitude(selected?.longitude != null ? String(selected.longitude) : "");
    setEditOpen(selected?.openingTime || "");
    setEditClose(selected?.closingTime || "");
  }, [picked, stations.rows]);

  useEffect(() => {
    if (!job.token || !picked || !can(role, ["STATION_MANAGER", "ORG_MANAGER"])) {
      setStaff(null);
      setStaffError("");
      return;
    }
    let cancelled = false;
    setStaffError("");
    backend.listStaff(job.token, picked)
      .then((data) => {
        if (!cancelled) setStaff(data.data as Row[]);
      })
      .catch((caught) => {
        if (!cancelled) {
          setStaff(null);
          setStaffError(caught instanceof ApiError ? caught.message : "Không tải được nhân viên.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [job.token, picked, job.note, role]);

  async function findStationCoordinates() {
    const query = address.trim();
    if (!query || geocoding) return;

    setGeocoding(true);
    setGeocodeMessage("");
    try {
      if (Platform.OS === "android") {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setGeocodeMessage("Cần quyền vị trí để tra cứu địa chỉ trên Android.");
          return;
        }
      }

      const results = await Location.geocodeAsync(query);
      const match = results[0];
      if (!match) {
        setGeocodeMessage("Không tìm thấy vị trí. Hãy nhập địa chỉ cụ thể hơn.");
        return;
      }

      setLatitude(match.latitude.toFixed(6));
      setLongitude(match.longitude.toFixed(6));
      setMapFocusKey((key) => key + 1);
      setGeocodeMessage("Đã tìm thấy vị trí. Bạn có thể chỉnh lại bằng cách chạm vào bản đồ.");
    } catch (caught) {
      setGeocodeMessage(caught instanceof Error ? `Không tra được địa chỉ: ${caught.message}` : "Không tra được địa chỉ.");
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <OpsGate>
      <Title>Trạm</Title>
      <Note text={stations.error || orgs.error || staffError || (role === "ADMIN" ? "" : job.note)} />
      {stations.rows ? (
        <StatRow
          items={[
            { label: "Đang mở", value: stations.rows.filter((r) => r.isActive).length, unit: "trạm", tone: "primary" },
            { label: "Chờ kích hoạt", value: stations.rows.filter((r) => !r.isActive).length, unit: "trạm", tone: "coral" },
            { label: "Tổng cộng", value: stations.rows.length, unit: "trạm", tone: "ink" },
          ]}
        />
      ) : null}
      {can(role, ["ADMIN", "ORG_MANAGER"]) ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pill label={`Tất cả (${stations.rows?.length ?? 0})`} active={stationFilter === "ALL"} onPress={() => { setStationFilter("ALL"); setPicked(""); }} />
          <Pill label={`${role === "ADMIN" ? "Đã duyệt" : "Đang mở"} (${stations.rows?.filter((row) => row.isActive).length ?? 0})`} active={stationFilter === "APPROVED"} onPress={() => { setStationFilter("APPROVED"); setPicked(""); }} />
          <Pill label={`${role === "ADMIN" ? "Chờ duyệt" : "Chờ kích hoạt"} (${stations.rows?.filter((row) => !row.isActive).length ?? 0})`} active={stationFilter === "PENDING"} onPress={() => { setStationFilter("PENDING"); setPicked(""); }} />
        </ScrollView>
      ) : null}
      <PickList rows={can(role, ["ADMIN", "ORG_MANAGER"]) ? visibleStations : stations.rows} selected={picked} onPick={setPicked} detail={(row) => `${row.isActive ? "Đang mở" : "Chưa kích hoạt"} · ${row.address || ""}`} />
      {picked ? (
        <View style={{ gap: 8 }}>
          {stations.rows?.find((row) => row._id === picked)?.imageUrl ? <Photo uri={stations.rows.find((row) => row._id === picked)?.imageUrl || ""} height={160} radius={14} /> : <Body muted>Trạm chưa có ảnh.</Body>}
          {canEditPhoto ? (
            <Button
              label={photoBusy ? "Đang tải ảnh..." : "Tải ảnh trạm"}
              tone="ghost"
              disabled={photoBusy}
              onPress={() => void (async () => {
                if (!job.token) return;
                setPhotoBusy(true);
                setPhotoNote("");
                try {
                  const file = await pickImage();
                  if (!file) return;
                  const uploaded = await backend.uploadStationImage(job.token, file);
                  if (!uploaded.imageUrl) {
                    setPhotoNote("Máy chủ không trả đường dẫn ảnh.");
                    return;
                  }
                  await backend.updateStation(job.token, picked, { imageUrl: uploaded.imageUrl });
                  stations.reload();
                  setPhotoNote("Đã lưu ảnh trạm.");
                } catch (caught) {
                  setPhotoNote(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Không tải được ảnh trạm.");
                } finally {
                  setPhotoBusy(false);
                }
              })()}
            />
          ) : null}
          {photoNote ? <Body>{photoNote}</Body> : null}
          {can(role, ["ADMIN", "ORG_MANAGER", "STATION_MANAGER"]) ? (
            <View style={{ gap: 8 }}>
              <Title>Sửa trạm</Title>
              <TextField label="Tên trạm" value={editName} onChangeText={setEditName} />
              <TextField label="Địa chỉ" value={editAddress} onChangeText={setEditAddress} />
              <TextField label="Vĩ độ" value={editLatitude} onChangeText={setEditLatitude} />
              <TextField label="Kinh độ" value={editLongitude} onChangeText={setEditLongitude} />
              <TextField label="Giờ mở" value={editOpen} onChangeText={setEditOpen} />
              <TextField label="Giờ đóng" value={editClose} onChangeText={setEditClose} />
              <Button
                label="Lưu thay đổi"
                onPress={() => void job.run((token) => backend.updateStation(token, picked, {
                  name: editName.trim(),
                  address: editAddress.trim(),
                  latitude: editLatitude.trim(),
                  longitude: editLongitude.trim(),
                  openingTime: editOpen.trim(),
                  closingTime: editClose.trim(),
                })).then((ok) => ok && stations.reload())}
              />
            </View>
          ) : null}
          {can(role, ["ADMIN"]) && stations.rows?.find((row) => row._id === picked)?.isActive ? <Body>Trạm này đã được duyệt.</Body> : null}
          {can(role, ["ADMIN"]) && !stations.rows?.find((row) => row._id === picked)?.isActive ? <Button label={approveStationJob.busy ? "Đang gửi" : "Duyệt trạm"} onPress={() => void approveStationJob.run((token) => backend.approveStation(token, picked)).then((ok) => ok && stations.reload())} /> : null}
          {can(role, ["ADMIN", "ORG_MANAGER"]) ? (
            <Button label="Xóa trạm" tone="danger" onPress={() => void job.run((token) => backend.deleteStation(token, picked)).then((ok) => { if (!ok) return; setPicked(""); stations.reload(); })} />
          ) : null}
          {role === "ORG_MANAGER" && stations.rows?.find((row) => row._id === picked)?.isActive ? (
            <View style={{ gap: 8 }}>
              <TextField label="Email hoặc điện thoại của trưởng trạm có sẵn" value={identifier} onChangeText={setIdentifier} />
              <Button label="Gán trưởng trạm có sẵn" tone="ghost" onPress={() => void job.run((token) => backend.assignStationManagerByContact(token, picked, identifier.trim()))} />
              <Button label="Gỡ trưởng trạm" tone="danger" onPress={() => void job.run((token) => backend.removeStationManager(token, picked))} />
            </View>
          ) : null}
          {can(role, ["STATION_MANAGER", "ORG_MANAGER"]) ? (
            <View style={{ gap: 8 }}>
              <Title>Nhân viên của trạm</Title>
              <PickList rows={staff} selected={staffId} onPick={setStaffId} detail={(row) => row.phone || row.username || ""} />
              {staffId ? <Button label="Gỡ nhân viên này" tone="danger" onPress={() => void job.run((token) => backend.removeStaff(token, picked, staffId))} /> : null}
            </View>
          ) : null}
          {role === "ORG_MANAGER" && picked && !stations.rows?.find((row) => row._id === picked)?.isActive ? <Body muted>Chờ admin duyệt trạm này rồi mới gán trưởng trạm.</Body> : null}
          {can(role, ["STATION_MANAGER", "ORG_MANAGER"]) ? (
            <View style={{ gap: 8 }}>
              <Title>Thêm nhân viên đã có tài khoản</Title>
              <Body muted>Người đó phải tự đăng ký trước. Chỉ điền một trong hai: email hoặc số điện thoại 10 số. Không tạo mật khẩu ở đây.</Body>
              <TextField label="Email hoặc số điện thoại" value={identifier} onChangeText={setIdentifier} />
              <Button
                label="Thêm vào trạm"
                tone="ghost"
                onPress={() => {
                  const value = identifier.trim();
                  const body = value.includes("@") ? { email: value } : { phone: value };
                  void job.run((token) => backend.createStaff(token, picked, body));
                }}
              />
            </View>
          ) : null}
          {role === "ORG_MANAGER" && stations.rows?.find((row) => row._id === picked)?.isActive ? (
            <View style={{ gap: 8 }}>
              <Title>Tạo tài khoản trưởng trạm mới</Title>
              <TextField label="Email" value={email} onChangeText={setEmail} />
              <TextField label="Username" value={username} onChangeText={setUsername} />
              <TextField label="Mật khẩu" value={password} onChangeText={setPassword} secure />
              <TextField label="Họ tên" value={fullName} onChangeText={setFullName} />
              <TextField label="Điện thoại" value={phone} onChangeText={setPhone} />
              <Button
                label="Tạo và gán trưởng trạm"
                onPress={() => {
                  if (!email.trim() || !username.trim() || !password || !fullName.trim()) {
                    job.fail("Vui lòng nhập đầy đủ email, username, mật khẩu và họ tên trưởng trạm.");
                    return;
                  }
                  if (!/^\d{10}$/.test(phone.trim())) {
                    job.fail("Số điện thoại trưởng trạm phải gồm đúng 10 chữ số.");
                    return;
                  }
                  void job.run((token) => backend.createStationManager(token, picked, {
                    email: email.trim(),
                    username: username.trim(),
                    password,
                    fullName: fullName.trim(),
                    phone: phone.trim(),
                  }));
                }}
              />
            </View>
          ) : null}
        </View>
      ) : null}
      {role === "ORG_MANAGER" ? (
        <>
          <View style={{ gap: 8 }}>
            <Title>Trạm mới</Title>
            <Body muted>Chọn tổ chức sở hữu trạm.</Body>
            <PickList rows={orgs.rows} selected={orgId} onPick={setOrgId} detail={orgDetail} />
            <TextField label="Tên trạm" value={name} onChangeText={setName} />
            <TextField
              label="Địa chỉ"
              value={address}
              onChangeText={(value) => {
                setAddress(value);
                if (latitude || longitude) setMapFocusKey((key) => key + 1);
                setLatitude("");
                setLongitude("");
                setGeocodeMessage("");
              }}
            />
            <Button
              label={geocoding ? "Đang tìm vị trí..." : "Tìm tọa độ từ địa chỉ"}
              tone="ghost"
              disabled={!address.trim() || geocoding}
              onPress={() => void findStationCoordinates()}
            />
            {geocodeMessage ? <Body muted>{geocodeMessage}</Body> : null}
            {Platform.OS === "android" || AppleMaps ? <Body muted>Chạm bản đồ để đặt vị trí trạm.</Body> : null}
            {Platform.OS === "android" || AppleMaps ? (
              <StationPlaceMap
                key={mapFocusKey}
                latitude={latitude}
                longitude={longitude}
                onPick={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
            ) : null}
            <TextField label="Vĩ độ (số thập phân, ví dụ 10.8289)" value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" />
            <TextField label="Kinh độ (số thập phân, ví dụ 106.8172)" value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" />
            {photoUrl ? <Photo uri={photoUrl} height={140} radius={14} /> : null}
            <Button
              label={photoBusy ? "Đang tải ảnh..." : photoUrl ? "Đổi ảnh trạm" : "Tải ảnh trạm"}
              tone="ghost"
              disabled={photoBusy}
              onPress={() => void (async () => {
                if (!job.token) return;
                setPhotoBusy(true);
                setPhotoNote("");
                try {
                  const file = await pickImage();
                  if (!file) return;
                  const uploaded = await backend.uploadStationImage(job.token, file);
                  if (!uploaded.imageUrl) {
                    setPhotoNote("Máy chủ không trả đường dẫn ảnh.");
                    return;
                  }
                  setPhotoUrl(uploaded.imageUrl);
                  setPhotoNote("Ảnh sẽ được gắn khi tạo trạm.");
                } catch (caught) {
                  setPhotoNote(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Không tải được ảnh trạm.");
                } finally {
                  setPhotoBusy(false);
                }
              })()}
            />
            <Button
              label="Tạo trạm"
              onPress={() => {
                if (!orgId) {
                  createStationJob.fail("Vui lòng chọn tổ chức sở hữu trạm ở danh sách phía trên.");
                  return;
                }
                if (!name.trim() || !address.trim()) {
                  createStationJob.fail("Vui lòng nhập đầy đủ Tên trạm và Địa chỉ.");
                  return;
                }
                const cleanLat = latitude.trim().replace(",", ".");
                const cleanLng = longitude.trim().replace(",", ".");
                if (/[°'"]/.test(cleanLat) || /[°'"]/.test(cleanLng)) {
                  createStationJob.fail("Tọa độ phải nhập dạng số thập phân dùng dấu chấm (ví dụ Vĩ độ: 10.8289, Kinh độ: 106.8172), không nhập độ-phút-giây (° ' \").");
                  return;
                }
                const numLat = Number(cleanLat);
                const numLng = Number(cleanLng);
                if ((cleanLat && (Number.isNaN(numLat) || numLat < -90 || numLat > 90)) || (cleanLng && (Number.isNaN(numLng) || numLng < -180 || numLng > 180))) {
                  createStationJob.fail("Tọa độ không hợp lệ. Vĩ độ phải từ -90 đến 90 (ví dụ 10.8289) và Kinh độ từ -180 đến 180 (ví dụ 106.8172).");
                  return;
                }
                void createStationJob.run((token) => backend.createStationForOrganization(token, orgId, {
                  name: name.trim(),
                  address: address.trim(),
                  latitude: cleanLat,
                  longitude: cleanLng,
                  ...(photoUrl ? { imageUrl: photoUrl } : {}),
                })).then((ok) => ok && stations.reload());
              }}
            />
          </View>
          <Note text={createStationJob.note} error={createStationJob.isError} />
        </>
      ) : role === "ADMIN" ? null : <Body muted>Vai trò này không tạo trạm.</Body>}
    </OpsGate>
  );
}

export function CatalogScreen() {
  const categories = useRows(async () => {
    const data = await backend.listCategories();
    return data.categories as Row[];
  });
  const items = useRows(async () => {
    const data = await backend.listItemTypes();
    return data.itemTypes as Row[];
  });
  const job = useJob();
  const role = useRole();
  const editor = can(role, ["ADMIN", "ORG_MANAGER", "STATION_MANAGER"]);
  const [categoryId, setCategoryId] = useState("");
  const [itemId, setItemId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [itemName, setItemName] = useState("");
  const [editItemName, setEditItemName] = useState("");
  const [editUnit, setEditUnit] = useState("KG");
  const [createUnit, setCreateUnit] = useState("KG");

  return (
    <OpsGate>
      <Title>Danh mục đồ</Title>
      <RoleNote />
      <Note text={categories.error || items.error || job.note} />
      {categories.rows && items.rows ? (
        <StatRow
          items={[
            { label: "Nhóm đồ", value: categories.rows.length, unit: "nhóm", tone: "primary" },
            { label: "Loại vật phẩm", value: items.rows.length, unit: "loại", tone: "coral" },
          ]}
        />
      ) : null}
      <Body>Nhóm đồ</Body>
      <PickList
        rows={categories.rows}
        selected={categoryId}
        onPick={(id) => {
          setCategoryId(id);
          setEditCategoryName(categories.rows?.find((row) => row._id === id)?.name || "");
        }}
        detail={() => "Nhóm"}
        panel={(row) => editor ? (
          <>
            <TextField label="Tên nhóm" value={editCategoryName} onChangeText={setEditCategoryName} />
            <Button label="Lưu tên nhóm" onPress={() => void job.run((token) => backend.updateCategory(token, row._id, { name: editCategoryName.trim() })).then((ok) => ok && categories.reload())} />
            <Button label="Xóa nhóm" tone="danger" onPress={() => void job.run((token) => backend.deleteCategory(token, row._id)).then((ok) => ok && categories.reload())} />
          </>
        ) : null}
      />
      {editor ? (
        <Fold title="Nhóm mới">
          <TextField label="Tên nhóm mới" value={categoryName} onChangeText={setCategoryName} />
          <Button label="Thêm nhóm" onPress={() => void job.run((token) => backend.createCategory(token, { name: categoryName.trim() })).then((ok) => ok && categories.reload())} />
        </Fold>
      ) : <Body muted>Vai trò này chỉ xem danh mục.</Body>}
      <Body>Loại đồ</Body>
      <PickList
        rows={items.rows}
        selected={itemId}
        onPick={(id) => {
          setItemId(id);
          const row = items.rows?.find((item) => item._id === id);
          setEditItemName(row?.name || "");
          setEditUnit(row?.unit || "KG");
        }}
        detail={(row) => row.unit || ""}
        panel={(row) => editor ? (
          <>
            <TextField label="Tên loại đồ" value={editItemName} onChangeText={setEditItemName} />
            <Units value={editUnit} onChange={setEditUnit} />
            <Button label="Lưu loại đồ" onPress={() => void job.run((token) => backend.updateItemType(token, row._id, { name: editItemName.trim(), unit: editUnit })).then((ok) => ok && items.reload())} />
            <Button label="Xóa loại đồ" tone="danger" onPress={() => void job.run((token) => backend.deleteItemType(token, row._id)).then((ok) => ok && items.reload())} />
          </>
        ) : null}
      />
      {editor ? (
        <Fold title="Loại đồ mới">
          <TextField label="Tên loại đồ" value={itemName} onChangeText={setItemName} />
          <Units value={createUnit} onChange={setCreateUnit} />
          <Button
            label="Thêm vào nhóm đang chọn"
            onPress={() => void job.run((token) => backend.createItemType(token, { categoryId, name: itemName.trim(), unit: createUnit })).then((ok) => ok && items.reload())}
          />
        </Fold>
      ) : null}
    </OpsGate>
  );
}

export function CampaignWork() {
  const campaigns = useRows(async (token) => {
    const data = await backend.listCampaigns(undefined, token);
    return data.campaigns as Row[];
  });
  const orgs = useRows((token) => backend.listOrganizations(token).then((data) => data.data as Row[]));
  const items = useRows(async () => (await backend.listItemTypes()).itemTypes as Row[]);
  const stations = useRows((token) => backend.listStations(token).then((data) => data.data as Row[]));
  const job = useJob();
  const role = useRole();
  const editor = can(role, ["ADMIN", "ORG_MANAGER", "STATION_MANAGER"]);
  const draftCampaigns = useRows(async (token) => {
    if (role !== "ADMIN") return [];
    const data = await backend.listCampaigns({ status: "DRAFT" }, token);
    return data.campaigns as Row[];
  });
  const [picked, setPicked] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<"ALL" | "DRAFT" | "ACTIVE" | "COMPLETED">("ALL");
  const [orgId, setOrgId] = useState("");
  const [itemId, setItemId] = useState("");
  const [stationId, setStationId] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  });
  const [endDate, setEndDate] = useState(() => addCampaignDays(new Date(), 6));
  const [activeCampaignDate, setActiveCampaignDate] = useState<"start" | "end" | null>(null);
  const [quantity, setQuantity] = useState("10");
  const visibleCampaigns = campaignFilter === "DRAFT"
    ? draftCampaigns.rows
    : campaigns.rows?.filter((campaign) => campaignFilter === "ALL" || campaign.status === campaignFilter) ?? null;
  const draftCount = draftCampaigns.error ? "—" : draftCampaigns.rows?.length ?? "…";
  const onCampaignDateChange = (event: DateTimePickerEvent, value?: Date) => {
    if (event.type === "dismissed") {
      setActiveCampaignDate(null);
      return;
    }
    if (value) {
      if (activeCampaignDate === "start") setStartDate(value);
      if (activeCampaignDate === "end") setEndDate(value);
    }
    if (Platform.OS === "android") setActiveCampaignDate(null);
  };
  const campaignDateField = (label: string, value: Date, field: "start" | "end") => {
    if (Platform.OS === "web") {
      return (
        <View key={field} style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>{label}</Text>
          {createElement("input", {
            type: "date",
            value: campaignDateValue(value),
            onChange: (event: ChangeEvent<HTMLInputElement>) => {
              const next = campaignDateFromInput(event.currentTarget.value);
              if (!Number.isNaN(next.getTime())) {
                if (field === "start") setStartDate(next);
                else setEndDate(next);
              }
            },
            "aria-label": label,
            style: {
              boxSizing: "border-box",
              width: "100%",
              minHeight: 48,
              borderRadius: 12,
              border: `1px solid ${colors.hairline}`,
              backgroundColor: colors.surface,
              padding: "0 12px",
              fontFamily: fonts.regular,
              fontSize: 16,
              color: colors.ink,
            },
          })}
        </View>
      );
    }
    return (
      <View key={field} style={{ gap: 6 }}>
        <Body muted>{label}</Body>
        <Button label={campaignDateValue(value)} tone="ghost" onPress={() => setActiveCampaignDate(field)} />
      </View>
    );
  };

  return (
    <OpsGate>
      <Title>Chiến dịch</Title>
      <RoleNote />
      <Note text={campaigns.error || draftCampaigns.error} />
      {campaigns.rows ? (
        <StatRow
          items={[
            { label: "Đang nhận", value: campaigns.rows.filter((r) => r.status === "ACTIVE").length, unit: "đợt", tone: "primary" },
            { label: "Hoàn thành", value: campaigns.rows.filter((r) => r.status === "COMPLETED").length, unit: "đợt", tone: "coral" },
            { label: "Tổng cộng", value: campaigns.rows.length, unit: "đợt", tone: "ink" },
          ]}
        />
      ) : null}
      {campaigns.rows ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pill
            label={`Tất cả (${campaigns.rows.length})`}
            active={campaignFilter === "ALL"}
            onPress={() => setCampaignFilter("ALL")}
          />
          {role === "ADMIN" ? (
            <Pill
              label={`Bản nháp (${draftCount})`}
              active={campaignFilter === "DRAFT"}
              onPress={() => {
                setCampaignFilter("DRAFT");
                setPicked("");
                draftCampaigns.reload();
              }}
            />
          ) : null}
          <Pill
            label={`Đang diễn ra (${campaigns.rows.filter((row) => row.status === "ACTIVE").length})`}
            active={campaignFilter === "ACTIVE"}
            onPress={() => setCampaignFilter("ACTIVE")}
          />
          <Pill
            label={`Hoàn thành (${campaigns.rows.filter((row) => row.status === "COMPLETED").length})`}
            active={campaignFilter === "COMPLETED"}
            onPress={() => setCampaignFilter("COMPLETED")}
          />
        </ScrollView>
      ) : null}
      <PickList
        rows={visibleCampaigns}
        selected={picked}
        onPick={setPicked}
        detail={(row) => donorLabel({ status: row.status || "" })}
        panel={(row) => editor ? (
          <>
            {nextCampaignStatuses(row.status || "DRAFT").map((status) => (
              <Button key={status} label={status === "CANCELLED" ? "Hủy chiến dịch" : row.status === "DRAFT" && status === "ACTIVE" ? "Duyệt" : donorLabel({ status })} tone={status === "CANCELLED" ? "danger" : "ghost"} onPress={() => void job.run((token) => backend.updateCampaignStatus(token, row._id, status)).then((ok) => {
                if (!ok) return;
                campaigns.reload();
                if (campaignFilter === "DRAFT") draftCampaigns.reload();
              })} />
            ))}
            {nextCampaignStatuses(row.status || "").length === 0 ? <Body muted>Chiến dịch này không còn trạng thái để chuyển.</Body> : null}
            <PickList rows={items.rows} selected={itemId} onPick={setItemId} detail={(item) => item.unit || ""} />
            <TextField label="Số mục tiêu" value={quantity} onChangeText={setQuantity} />
            <Button label="Gắn loại đồ" onPress={() => void job.run((token) => backend.addCampaignItem(token, row._id, { itemTypeId: itemId, targetQuantity: Number(quantity), priority: "MEDIUM" }))} />
            {itemId ? <Button label="Gỡ loại đồ đang chọn" tone="danger" onPress={() => void job.run((token) => backend.removeCampaignItem(token, row._id, itemId))} /> : null}
            <PickList rows={stations.rows} selected={stationId} onPick={setStationId} detail={(station) => station.address || ""} />
            <Button label="Gắn trạm" onPress={() => void job.run((token) => backend.assignCampaignStation(token, row._id, stationId))} />
            {stationId ? <Button label="Gỡ trạm đang chọn" tone="danger" onPress={() => void job.run((token) => backend.removeCampaignStation(token, row._id, stationId))} /> : null}
            <Note text={job.note} />
          </>
        ) : null}
      />
      {editor ? <Title>Chiến dịch mới</Title> : null}
      {editor ? <Body muted>Thời lượng từ 5 đến 7 ngày.</Body> : null}
      {editor ? (
        <View style={{ gap: 8 }}>
          <PickList rows={orgs.rows} selected={orgId} onPick={setOrgId} detail={(row) => row.address || ""} />
          <TextField label="Tên chiến dịch" value={title} onChangeText={setTitle} />
          {campaignDateField("Ngày bắt đầu", startDate, "start")}
          {campaignDateField("Ngày kết thúc", endDate, "end")}
          {activeCampaignDate && Platform.OS !== "web" ? (
            <View style={{ gap: 8 }}>
              <DateTimePicker
                value={activeCampaignDate === "start" ? startDate : endDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={activeCampaignDate === "start" ? new Date() : startDate}
                onChange={onCampaignDateChange}
              />
              {Platform.OS === "ios" ? <Button label="Xong" onPress={() => setActiveCampaignDate(null)} /> : null}
            </View>
          ) : null}
          <Button
            label="Tạo bản nháp"
            onPress={() => void job.run(async (token) => {
              const station = stations.rows?.find((row) => row._id === stationId) || stations.rows?.[0];
              const linked = (station as (Row & { organizationId?: string | { _id?: string } }) | undefined)?.organizationId;
              const organizationId = orgId || (typeof linked === "string" ? linked : linked?._id || "");
              const data = await backend.createCampaign(token, {
                title: title.trim(),
                startDate: campaignDateValue(startDate),
                endDate: campaignDateValue(endDate),
                organizationId,
              });
              if (data.campaign?._id) {
                setPicked(data.campaign._id);
                campaigns.reload();
                if (role === "ADMIN") {
                  setCampaignFilter("DRAFT");
                  draftCampaigns.reload();
                }
              }
              return data;
            })}
          />
        </View>
      ) : null}
      {editor && picked && !campaigns.rows?.some((row) => row._id === picked) ? (
        <View style={{ gap: 8 }}>
          <Body muted>Bản nháp vừa tạo chưa hiện trong danh sách công khai. Gắn trạm đang hoạt động, rồi duyệt để chiến dịch chạy.</Body>
          <PickList rows={items.rows} selected={itemId} onPick={setItemId} detail={(item) => item.unit || ""} />
          <TextField label="Số mục tiêu" value={quantity} onChangeText={setQuantity} />
          <Button label="Gắn loại đồ" onPress={() => void job.run((token) => backend.addCampaignItem(token, picked, { itemTypeId: itemId, targetQuantity: Number(quantity), priority: "MEDIUM" }))} />
          <PickList rows={stations.rows} selected={stationId} onPick={setStationId} detail={(station) => station.address || ""} />
          <Button label="Gắn trạm" onPress={() => void job.run((token) => backend.assignCampaignStation(token, picked, stationId))} />
          <Button label="Duyệt" onPress={() => void job.run((token) => backend.updateCampaignStatus(token, picked, "ACTIVE")).then((ok) => ok && campaigns.reload())} />
          <Note text={job.note} />
        </View>
      ) : null}
    </OpsGate>
  );
}
