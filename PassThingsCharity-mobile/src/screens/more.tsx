import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { isOperator, useSession } from "@/api/session";
import type { StationRow } from "@/api/types";
import { Screen } from "@/components/chrome";
import { PasswordReset } from "@/components/form";
import { Body, Button, Card, Eyebrow, Icon, Pill, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

const AppleMaps = Platform.OS === "ios" ? (require("expo-maps") as typeof import("expo-maps")).AppleMaps : null;
const LiveQr = Platform.OS === "web" ? null : (require("./qr-camera") as typeof import("./qr-camera")).LiveQr;

const stations = [
  { name: "Trạm Đa Kao", address: "45 Mạc Đĩnh Chi, Quận 1", hours: "08:00–18:30", km: "1,2 km", load: "Đang nhận" },
  { name: "Trạm Phú Mỹ Hưng", address: "Nguyễn Lương Bằng, Quận 7", hours: "08:30–20:00", km: "6,4 km", load: "Còn chỗ" },
  { name: "Trạm Bình Thạnh", address: "125 Bạch Đằng, Bình Thạnh", hours: "08:30–20:00", km: "2,4 km", load: "Gần đầy" },
];

function distanceKm(here: PlaceFix, latitude: number, longitude: number) {
  const earth = 6371;
  const lat = ((latitude - here.latitude) * Math.PI) / 180;
  const lng = ((longitude - here.longitude) * Math.PI) / 180;
  const a = Math.sin(lat / 2) ** 2
    + Math.cos((here.latitude * Math.PI) / 180) * Math.cos((latitude * Math.PI) / 180) * Math.sin(lng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stationDistance(here: PlaceFix | null, station: StationRow) {
  const latitude = Number(station.latitude);
  const longitude = Number(station.longitude);
  if (!here || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return distanceKm(here, latitude, longitude);
}

function StationPeek({ station }: { station: StationRow }) {
  const latitude = Number(station.latitude);
  const longitude = Number(station.longitude);
  if (!AppleMaps || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return <Body muted>Bản đồ Apple mở trên iPhone.</Body>;
  }
  return (
    <View style={{ height: 168, borderRadius: 14, overflow: "hidden" }}>
      <AppleMaps.View
        style={{ flex: 1, width: "100%" }}
        cameraPosition={{ coordinates: { latitude, longitude }, zoom: 16 }}
        markers={[{ id: station._id, title: station.name, coordinates: { latitude, longitude }, tintColor: colors.primary }]}
        uiSettings={{ myLocationButtonEnabled: false, compassEnabled: false, scaleBarEnabled: false }}
        colorScheme={AppleMaps.MapColorScheme.LIGHT}
      />
    </View>
  );
}

function StationCards({ here }: { here: PlaceFix | null }) {
  const { token } = useSession();
  const [rows, setRows] = useState<StationRow[] | null>(null);
  const [problem, setProblem] = useState("");
  const [openId, setOpenId] = useState("");

  useEffect(() => {
    if (!token) {
      setRows(null);
      setProblem("");
      return;
    }
    let cancelled = false;
    backend.listStations(token)
      .then((data) => {
        if (!cancelled) setRows(data.data);
      })
      .catch((caught) => {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Không tải được trạm.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <View style={{ gap: 14 }}>
        <Body muted>Danh sách dưới là bản minh họa. Đăng nhập để lấy trạm từ máy chủ.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
        {stations.map((station) => (
          <Card key={station.name}>
            <Eyebrow>{`${station.km} · ${station.load}`}</Eyebrow>
            <Text style={{ fontFamily: fonts.bold, fontSize: 17 }}>{station.name}</Text>
            <Body muted>{station.address}</Body>
            <Body muted>{station.hours}</Body>
          </Card>
        ))}
      </View>
    );
  }

  if (!rows && !problem) {
    return (
      <Card>
        <ActivityIndicator color={colors.primary} />
        <Title>Đang tải trạm</Title>
      </Card>
    );
  }

  if (problem || !rows) {
    return (
      <Card>
        <Title>Không tải được trạm</Title>
        <Body>{problem || "Máy chủ không trả danh sách."}</Body>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <Title>Chưa có trạm đang mở</Title>
        <Body>Tài khoản này không thấy trạm đã kích hoạt.</Body>
      </Card>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {rows.map((station) => {
        const km = stationDistance(here, station);
        const latitude = Number(station.latitude);
        const longitude = Number(station.longitude);
        const canMap = Number.isFinite(latitude) && Number.isFinite(longitude);
        const open = openId === station._id;
        return (
          <Card key={station._id}>
            <Tap
              onPress={() => {
                if (!canMap) return;
                setOpenId(open ? "" : station._id);
              }}
              accessibilityLabel={`Xem ${station.name} trên bản đồ`}
            >
              <View style={{ gap: 4 }}>
                <Eyebrow>{station.isActive ? "Đang mở" : "Chưa kích hoạt"}</Eyebrow>
                <Text style={{ fontFamily: fonts.bold, fontSize: 17 }}>{station.name}</Text>
                <Body muted>{station.address}</Body>
                {station.openingTime || station.closingTime ? <Body muted>{`${station.openingTime || "?"} đến ${station.closingTime || "?"}`}</Body> : null}
                {km !== null ? <Body muted>{`Cách bạn ${km.toFixed(1)} km.`}</Body> : <Body muted>Chưa có vị trí đang đứng nên chưa tính khoảng cách.</Body>}
                <Body muted>{canMap ? (open ? "Bấm lại để thu bản đồ." : "Bấm để mở bản đồ của trạm này.") : "Trạm chưa có tọa độ nên chưa mở được bản đồ."}</Body>
              </View>
            </Tap>
            <Button label="Xem chi tiết" tone="ghost" onPress={() => router.push(`/station/${station._id}`)} />
            {open && canMap ? <StationPeek station={station} /> : null}
          </Card>
        );
      })}
    </View>
  );
}

type PlaceFix = { latitude: number; longitude: number };

function usePlaceAccess(active: boolean) {
  const [text, setText] = useState("Đang mở bản đồ các trạm.");
  const [here, setHere] = useState<PlaceFix | null>(null);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setText("Điện thoại đang hỏi quyền vị trí. Hãy bấm Cho phép.");
    Location.requestForegroundPermissionsAsync()
      .then(async ({ status }) => {
        if (cancelled) return;
        if (status !== "granted") {
          setHere(null);
          setText("Chưa cho phép vị trí. Vào Cài đặt iPhone, chọn Pass Things Charity, rồi bật Vị trí khi dùng app.");
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setHere({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setText("Chấm xanh là bạn. Chấm đậm là trạm nhận đồ. Mũi tên sát mép chỉ trạm ngoài khung và số km.");
      })
      .catch(() => {
        if (!cancelled) setText("Điện thoại không mở được quyền vị trí.");
      });
    return () => {
      cancelled = true;
    };
  }, [active]);
  return { text, here };
}

function mercatorY(latitude: number) {
  const sine = Math.sin((latitude * Math.PI) / 180);
  return 0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI);
}

const rimChipWide = 92;
const rimChipTall = 30;

function spreadAlong(values: number[], min: number, max: number, gap: number) {
  const next = values.map((value) => Math.min(Math.max(value, min), max));
  for (let index = 1; index < next.length; index += 1) {
    if (next[index] < next[index - 1] + gap) next[index] = next[index - 1] + gap;
  }
  const overflow = next[next.length - 1] - max;
  if (overflow > 0) {
    for (let index = 0; index < next.length; index += 1) next[index] -= overflow;
  }
  for (let index = next.length - 2; index >= 0; index -= 1) {
    if (next[index] > next[index + 1] - gap) next[index] = next[index + 1] - gap;
  }
  return next.map((value) => Math.min(Math.max(value, min), max));
}

function edgePoints(
  rows: StationRow[] | null,
  here: PlaceFix | null,
  camera: { latitude: number; longitude: number; zoom: number },
  size: { width: number; height: number },
  bottomInset: number,
) {
  if (!size.width || !size.height) return [];
  const world = 256 * 2 ** camera.zoom;
  const centerX = size.width / 2;
  const centerY = size.height / 2;
  const inset = 8;
  type Hit = { id: string; name: string; km: number | null; turn: number; edge: "left" | "right" | "top" | "bottom"; along: number };
  const hits: Hit[] = [];
  for (const station of rows ?? []) {
    const latitude = Number(station.latitude);
    const longitude = Number(station.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const dx = ((longitude - camera.longitude) / 360) * world;
    const dy = (mercatorY(latitude) - mercatorY(camera.latitude)) * world;
    if (dx === 0 && dy === 0) continue;
    const screenX = centerX + dx;
    const screenY = centerY + dy;
    if (
      screenX >= inset && screenX <= size.width - inset
      && screenY >= inset && screenY <= size.height - bottomInset
    ) continue;
    let scale = 1;
    if (dx > 0) scale = Math.min(scale, (size.width - inset - centerX) / dx);
    if (dx < 0) scale = Math.min(scale, (inset - centerX) / dx);
    if (dy > 0) scale = Math.min(scale, (size.height - bottomInset - inset - centerY) / dy);
    if (dy < 0) scale = Math.min(scale, (inset - centerY) / dy);
    if (scale >= 1) continue;
    const x = centerX + dx * scale;
    const y = centerY + dy * scale;
    const edge = x <= inset + 24 ? "left" : x >= size.width - inset - 24 ? "right" : y <= inset + 24 ? "top" : "bottom";
    const vertical = edge === "left" || edge === "right";
    hits.push({
      id: station._id,
      name: station.name,
      km: stationDistance(here, station),
      turn: (Math.atan2(dx, -dy) * 180) / Math.PI,
      edge,
      along: vertical ? y - rimChipTall / 2 : x - rimChipWide / 2,
    });
  }
  const placed: { id: string; name: string; km: number | null; turn: number; left: number; top: number }[] = [];
  for (const edge of ["left", "right", "top", "bottom"] as const) {
    const group = hits.filter((hit) => hit.edge === edge).sort((a, b) => a.along - b.along);
    if (!group.length) continue;
    const vertical = edge === "left" || edge === "right";
    const min = edge === "right" ? 72 : 12;
    const max = vertical
      ? size.height - bottomInset - rimChipTall - 12
      : size.width - rimChipWide - (edge === "top" ? 64 : 12);
    if (max <= min) continue;
    const along = spreadAlong(group.map((hit) => hit.along), min, max, vertical ? rimChipTall + 8 : rimChipWide + 8);
    group.forEach((hit, index) => {
      const spot = along[index];
      if (edge === "left") placed.push({ ...hit, left: inset, top: spot });
      if (edge === "right") placed.push({ ...hit, left: size.width - inset - rimChipWide, top: spot });
      if (edge === "top") placed.push({ ...hit, left: spot, top: inset });
      if (edge === "bottom") placed.push({ ...hit, left: spot, top: size.height - bottomInset - inset - rimChipTall });
    });
  }
  return placed;
}

function stationFixes(rows: StationRow[] | null) {
  return (rows ?? []).flatMap((station) => {
    const latitude = Number(station.latitude);
    const longitude = Number(station.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    return [{ id: station._id, title: station.name, coordinates: { latitude, longitude }, tintColor: colors.primary }];
  });
}

function StationFacts({ station, here }: { station: StationRow; here: PlaceFix | null }) {
  const km = stationDistance(here, station);
  const hours = station.openingTime || station.closingTime
    ? `${station.openingTime || "?"} đến ${station.closingTime || "?"}`
    : "Chưa có giờ mở cửa.";
  return (
    <Card>
      <Eyebrow>{station.isActive ? "Đang mở" : "Chưa kích hoạt"}</Eyebrow>
      <Title>{station.name}</Title>
      <Body>{station.address}</Body>
      <Body muted>{hours}</Body>
      <Body muted>{km !== null ? `Cách bạn ${km.toFixed(1)} km.` : "Chưa có vị trí đang đứng nên chưa tính khoảng cách."}</Body>
      <Button label="Xem chi tiết" tone="ghost" onPress={() => router.push(`/station/${station._id}`)} />
    </Card>
  );
}

function PlaceMap({ here, focusId }: { here: PlaceFix | null; focusId: string }) {
  const { token } = useSession();
  const mapRef = useRef<{ setCameraPosition: (config?: { coordinates?: { latitude?: number; longitude?: number }; zoom?: number }) => Promise<void> } | null>(null);
  const glideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);
  const anchor = useRef({ latitude: here?.latitude ?? 10.7769, longitude: here?.longitude ?? 106.7009, zoom: here ? 14 : 12 });
  if (!moved.current && here) anchor.current = { latitude: here.latitude, longitude: here.longitude, zoom: 14 };
  const [rows, setRows] = useState<StationRow[] | null>(null);
  const [infoId, setInfoId] = useState(focusId);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [liveCamera, setLiveCamera] = useState<{ latitude: number; longitude: number; zoom: number } | null>(null);
  useEffect(() => () => {
    if (glideTimer.current) clearTimeout(glideTimer.current);
  }, []);
  useEffect(() => {
    setInfoId(focusId);
  }, [focusId]);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    backend.listStations(token)
      .then((data) => {
        if (!cancelled) setRows(data.data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);
  function glide(latitude: number, longitude: number) {
    moved.current = true;
    const from = liveCamera ?? anchor.current;
    if (glideTimer.current) clearTimeout(glideTimer.current);
    const km = distanceKm(from, latitude, longitude);
    const map = mapRef.current;
    if (!map || km < 1.2) {
      void map?.setCameraPosition({ coordinates: { latitude, longitude }, zoom: 16 });
      return;
    }
    void map.setCameraPosition({
      coordinates: {
        latitude: (from.latitude + latitude) / 2,
        longitude: (from.longitude + longitude) / 2,
      },
      zoom: Math.max(10, Math.min(12.5, 15.2 - Math.log2(km))),
    });
    glideTimer.current = setTimeout(() => {
      void mapRef.current?.setCameraPosition({ coordinates: { latitude, longitude }, zoom: 16 });
    }, 980);
  }
  useEffect(() => {
    if (!focusId || !rows) return;
    const station = rows.find((row) => row._id === focusId);
    const latitude = Number(station?.latitude);
    const longitude = Number(station?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    glide(latitude, longitude);
  }, [focusId, rows]);
  const markers = stationFixes(rows);
  const infoStation = rows?.find((row) => row._id === infoId) ?? null;
  const camera = liveCamera ?? anchor.current;
  const outside = edgePoints(rows, here, camera, mapSize, infoStation ? 150 : 36);
  if (Platform.OS !== "ios" || !AppleMaps) {
    return infoStation ? <StationFacts station={infoStation} here={here} /> : <Body>Bản đồ Apple mở trên iPhone. Trên máy này chỉ xem được danh sách trạm.</Body>;
  }
  return (
    <View
      style={{ flex: 1, borderRadius: 18, overflow: "hidden" }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setMapSize({ width, height });
      }}
    >
      <AppleMaps.View
        ref={mapRef}
        style={{ flex: 1, width: "100%" }}
        cameraPosition={{
          coordinates: { latitude: anchor.current.latitude, longitude: anchor.current.longitude },
          zoom: anchor.current.zoom,
        }}
        markers={markers}
        properties={{ isMyLocationEnabled: Boolean(here) }}
        uiSettings={{ myLocationButtonEnabled: true, compassEnabled: true, scaleBarEnabled: true }}
        colorScheme={AppleMaps.MapColorScheme.LIGHT}
        onCameraMove={(event) => {
          if (!event.coordinates.latitude || !event.coordinates.longitude) return;
          setLiveCamera({
            latitude: event.coordinates.latitude,
            longitude: event.coordinates.longitude,
            zoom: event.zoom,
          });
        }}
        onMarkerClick={(marker) => {
          const id = marker.id || "";
          setInfoId(id);
          const latitude = marker.coordinates?.latitude;
          const longitude = marker.coordinates?.longitude;
          if (latitude == null || longitude == null) return;
          glide(latitude, longitude);
        }}
        onMapClick={() => setInfoId("")}
      />
      {outside.map((point) => (
        <Tap
          key={point.id}
          accessibilityLabel={`${point.name}, ${point.km === null ? "chưa có khoảng cách" : `cách ${point.km.toFixed(1)} km`}`}
          onPress={() => {
            setInfoId(point.id);
            const station = rows?.find((row) => row._id === point.id);
            const latitude = Number(station?.latitude);
            const longitude = Number(station?.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
            glide(latitude, longitude);
          }}
          style={{
            position: "absolute",
            left: point.left,
            top: point.top,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: colors.primary,
            borderRadius: 999,
            paddingLeft: 6,
            paddingRight: 8,
            paddingVertical: 4,
            borderWidth: 2,
            borderColor: "#ffffff",
          }}
        >
          <View style={{ transform: [{ rotate: `${point.turn}deg` }] }}>
            <Icon name="arrow-upward" size={14} color={colors.onPrimary} />
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.onPrimary }}>
            {point.km === null ? "…" : `${point.km.toFixed(1)} km`}
          </Text>
        </Tap>
      ))}
      {infoStation ? (
        <View style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
          <StationFacts station={infoStation} here={here} />
        </View>
      ) : null}
    </View>
  );
}

export function StationsScreen({
  state,
}: {
  state: "list" | "map" | "overload" | "closed" | "loading" | "error" | "denied";
}) {
  const place = usePlaceAccess(state === "map" || state === "list");
  const { user } = useSession();
  const params = useLocalSearchParams<{ station?: string }>();
  const focusId = typeof params.station === "string" ? params.station : "";
  if (state === "denied") {
    return (
      <Screen tab="stations">
        <Title>Chưa có quyền vị trí</Title>
        <Body>Bản đồ không hiện khoảng cách. Bạn vẫn chọn trạm trong danh sách và xem giờ mở cửa.</Body>
        <Button label="Xem danh sách trạm" onPress={() => router.push("/stations/list")} />
      </Screen>
    );
  }
  if (state === "loading") {
    return (
      <Screen tab="stations">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang tải trạm</Title>
          <Body muted>Chưa gợi ý trạm khi danh sách chưa về.</Body>
        </Card>
        <Button label="Xem trạm đã tải" onPress={() => router.replace("/stations/list")} />
      </Screen>
    );
  }
  if (state === "error") {
    return (
      <Screen tab="stations">
        <Title>Không tải được trạm</Title>
        <Body>Giờ mở cửa trên màn cũ có thể sai. Hãy thử lại trước khi mang đồ tới.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/stations/list")} />
      </Screen>
    );
  }
  if (state === "closed") {
    return (
      <Screen tab="stations">
        <Eyebrow>Ngoài giờ nhận</Eyebrow>
        <Title>Đa Kao đóng cửa lúc 18:30</Title>
        <Body>Quầy không nhận kiện sau giờ này. Phú Mỹ Hưng còn mở đến 20:00.</Body>
        <Button label="Xem Phú Mỹ Hưng" onPress={() => router.push("/stations/list")} />
      </Screen>
    );
  }
  if (state === "map") {
    return (
      <Screen tab="stations" scroll={false}>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pill label="Danh sách" active={false} onPress={() => router.push("/stations/list")} />
            <Pill label="Bản đồ" active onPress={() => router.push("/stations/map")} />
          </View>
          <PlaceMap here={place.here} focusId={focusId} />
          <Body>{`${place.text} Bấm vùng trống trên bản đồ để đóng thẻ trạm.`}</Body>
        </View>
      </Screen>
    );
  }
  return (
    <Screen tab="stations">
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pill label="Danh sách" active onPress={() => router.push("/stations/list")} />
        <Pill label="Bản đồ" active={false} onPress={() => router.push("/stations/map")} />
      </View>
      <StationCards here={place.here} />
      {isOperator(user?.role) ? <Button label="Vào quầy kiểm định" onPress={() => router.push("/intake/review")} /> : null}
      {user?.role === "STATION_MANAGER" || user?.role === "ORG_MANAGER" || user?.role === "STAFF" ? <Button label="Ca trực hôm nay" tone="ghost" onPress={() => router.push("/shifts")} /> : null}
    </Screen>
  );
}

export function ReceiptScreen({ state }: { state: "done" | "pending" | "rejected" | "loading" | "error" }) {
  if (state === "loading") {
    return (
      <Screen tab="profile">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang tải biên lai</Title>
          <Body muted>Chưa hiện số kg khi biên lai chưa về.</Body>
        </Card>
        <Button label="Xem biên lai đã tải" onPress={() => router.replace("/receipt/done")} />
      </Screen>
    );
  }
  if (state === "error") {
    return (
      <Screen tab="profile">
        <Title>Không thấy biên lai này</Title>
        <Body>Mã không còn hoặc máy chưa đọc được. Đừng chụp màn hình trống để làm bằng chứng.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/receipt/done")} />
      </Screen>
    );
  }
  if (state === "pending") {
    return (
      <Screen tab="stations">
        <Eyebrow>Đang cân · chưa phải biên lai</Eyebrow>
        <Title>Kiện đang trên bàn</Title>
        <Body>Ước lượng khoảng 5,2 kg áo khoác. Số này chưa vào chiến dịch và chưa cộng điểm cho đến khi nhân viên ký.</Body>
        <Button label="Xem biên lai sau khi ký" onPress={() => router.push("/receipt/done")} />
      </Screen>
    );
  }
  if (state === "rejected") {
    return (
      <Screen tab="profile">
        <Eyebrow>#RC-2025-HG-0842</Eyebrow>
        <Title>1,5 kg không vào chiến dịch</Title>
        <Body>Váy mùa hè và áo hai dây không đúng nhu cầu áo ấm Hà Giang. Bạn nhận lại trong ngày hoặc để trạm chuyển tái chế.</Body>
        <Button label="Để trạm tái chế" onPress={() => router.push("/profile/full")} />
        <Button label="Tôi sẽ nhận lại" tone="ghost" onPress={() => router.push("/profile/full")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <Eyebrow>Biên lai #RC-2025-HG-0842</Eyebrow>
      <Title>Đã nhận 8,5 kg</Title>
      <Body>Trạm Đa Kao · 10:45 · Nguyễn Thu Thảo ký. Áo khoác 5,0 kg và quần 3,5 kg vào chiến dịch. 1,5 kg loại ra.</Body>
      <Card>
        <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.primary }}>+85 điểm</Text>
        <Body muted>10 điểm mỗi kg đạt. Phần loại = 0 điểm.</Body>
      </Card>
      <Button label="Góp ý quầy" tone="ghost" onPress={() => router.push("/feedback")} />
    </Screen>
  );
}

export function OtpScreen({ state }: { state: "enter" | "resend" | "error" | "locked" }) {
  if (state === "locked") {
    return (
      <Screen tab="profile">
        <Title>Tạm khóa nhập mã</Title>
        <Body>Máy chủ không khóa sau ba lần sai. Mã hết hạn sau 10 phút. Gửi email mới để lấy mã khác.</Body>
        <Button label="Mang đồ như khách" onPress={() => router.push("/intake/guest")} />
        <Button label="Nhập lại sau" tone="ghost" onPress={() => router.push("/otp/enter")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <PasswordReset />
      {state === "error" ? <Body>Mã sai hoặc đã hết hạn. Gửi lại email để lấy mã mới.</Body> : null}
      {state === "resend" ? <Body muted>Bấm Gửi mã ở form trên. Máy chủ không đếm 42 giây.</Body> : null}
      <Button label="Mã bị khóa" tone="ghost" onPress={() => router.push("/otp/locked")} />
    </Screen>
  );
}

export function QrScreen({ state }: { state: "scan" | "error" | "success" | "expired" | "checking" }) {
  if (state === "checking") {
    return (
      <Screen tab="stations">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang kiểm tra vị trí</Title>
          <Body muted>Chưa vào ca khi chưa biết bạn có đứng trong 80 m của trạm hay không.</Body>
        </Card>
        <Button label="Trong phạm vi" onPress={() => router.replace("/qr/success")} />
        <Button label="Ngoài phạm vi" tone="ghost" onPress={() => router.push("/qr/error")} />
      </Screen>
    );
  }
  if (state === "expired") {
    return (
      <Screen tab="stations">
        <Title>Mã quầy đã đổi</Title>
        <Body>Mã này hết hạn lúc 13:40. Nhờ trưởng ca chiếu mã mới. Ca chưa được tính giờ.</Body>
        <Button label="Quét mã mới" onPress={() => router.push("/qr/scan")} />
      </Screen>
    );
  }
  if (state === "error") {
    return (
      <Screen tab="stations">
        <Title>Mã không dùng được</Title>
        <Body>Bạn đang ngoài bán kính 80 m của Trạm Đa Kao, hoặc mã không thuộc ca này.</Body>
        <Button label="Thử lại" onPress={() => router.push("/qr/scan")} />
      </Screen>
    );
  }
  if (state === "success") {
    return (
      <Screen tab="stations">
        <Title>Đã vào ca</Title>
        <Body>13:28 tại Trạm Đa Kao. Giờ bắt đầu tính. Điểm được cộng khi ca được chốt.</Body>
        <Button label="Về bảng ca" onPress={() => router.push("/volunteer/active")} />
      </Screen>
    );
  }
  return (
    <Screen tab="stations">
      {LiveQr ? <LiveQr /> : <Body>Camera quét mã mở trên điện thoại. Máy chủ chưa nhận mã này.</Body>}
    </Screen>
  );
}

export function ReceiveScreen({ state }: { state: "form" | "error" | "success" | "stock" | "sending" }) {
  const [note, setNote] = useState(state === "error" ? "Cần đồ ấm" : "");
  const [picked, setPicked] = useState(state !== "error");
  if (state === "success") {
    return (
      <Screen tab="give">
        <Eyebrow>Hồ sơ #RCV-2025-0891</Eyebrow>
        <Title>Đã gửi phiếu nhận</Title>
        <Body>Trạm Đa Kao sẽ soạn đồ ấm và sách lớp 3. Bạn nhận mã PIN qua SMS. Danh tính không đăng công khai.</Body>
        <Body muted>Máy chủ chưa có phiếu xin nhận của người dân. Giao hàng cứu trợ nằm ở màn phân phối.</Body>
        <Button label="Về trang chủ" onPress={() => router.push("/")} />
      </Screen>
    );
  }
  if (state === "stock") {
    return (
      <Screen tab="give">
        <Title>Đa Kao hết mì gói</Title>
        <Body>Đang giữ 0 thùng. Áo ấm còn 120 kg tại trạm này. Phiếu xin mì sẽ không được gửi.</Body>
        <Button label="Xin áo ấm" onPress={() => router.push("/receive/form")} />
        <Button label="Xem sổ trạm" tone="ghost" onPress={() => router.push("/ledger/content")} />
      </Screen>
    );
  }
  if (state === "sending") {
    return (
      <Screen tab="give">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang gửi phiếu</Title>
          <Body muted>Chưa có mã hồ sơ khi trạm chưa nhận phiếu.</Body>
        </Card>
        <Button label="Xem khi đã gửi" onPress={() => router.replace("/receive/success")} />
      </Screen>
    );
  }
  const noteOk = note.trim().length >= 20;
  const valid = picked && noteOk;
  return (
    <Screen tab="give">
      <Title>Đăng ký nhận hỗ trợ</Title>
      <Body muted>Chọn đúng món trạm đang có. Không gửi phiếu nếu chưa chọn nhóm đồ và ghi chú còn quá ngắn.</Body>
      {!picked && state === "error" ? <Text style={{ color: colors.error, fontFamily: fonts.medium }}>Chưa chọn nhóm đồ.</Text> : null}
      <Button label={picked ? "Đã chọn: áo ấm" : "Chọn áo ấm"} tone={picked ? "primary" : "ghost"} onPress={() => setPicked(true)} />
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Hoàn cảnh và cỡ đồ, tối thiểu 20 ký tự"
        placeholderTextColor={colors.outline}
        multiline
        style={{
          minHeight: 96,
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: state === "error" && !noteOk ? colors.error : colors.hairline,
          padding: 12,
          fontFamily: fonts.regular,
          fontSize: 15,
          color: colors.ink,
        }}
      />
      {state === "error" && !noteOk ? (
        <Text style={{ color: colors.error, fontFamily: fonts.medium }}>{note.trim().length}/20 ký tự</Text>
      ) : null}
      <Button
        label="Gửi phiếu"
        onPress={() => {
          if (!valid) router.push("/receive/error");
          else router.push("/receive/sending");
        }}
      />
    </Screen>
  );
}

export function FeedbackScreen({ mode = "form" }: { mode?: "form" | "sent" | "invalid" }) {
  const [score, setScore] = useState(0);
  if (mode === "sent") {
    return (
      <Screen tab="profile">
        <Title>Đã ghi nhận góp ý</Title>
        <Body>Quầy Đa Kao nhận góp ý cho biên lai #RC-2025-HG-0842. Điểm tín nhiệm không đổi vì góp ý.</Body>
        <Button label="Về hồ sơ" onPress={() => router.push("/profile/full")} />
      </Screen>
    );
  }
  if (mode === "invalid") {
    return (
      <Screen tab="profile">
        <Title>Chưa chọn mức điểm</Title>
        <Body>Chọn từ 1 đến 5 trước khi gửi. Góp ý chưa được ghi.</Body>
        <Button label="Chọn điểm" onPress={() => router.push("/feedback")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <Title>Quầy hôm nay thế nào?</Title>
      <Body muted>Góp ý cho lần tiếp nhận #RC-2025-HG-0842 tại Đa Kao.</Body>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Tap
            key={n}
            onPress={() => setScore(n)}
            accessibilityLabel={`${n} điểm`}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: score === n ? colors.primary : colors.card,
              borderWidth: 1,
              borderColor: score === n ? colors.primary : colors.hairline,
            }}
          >
            <Text style={{ fontFamily: fonts.bold, color: score === n ? colors.onPrimary : colors.primary }}>{n}</Text>
          </Tap>
        ))}
      </View>
      <Button
        label="Gửi góp ý"
        onPress={() => {
          if (score > 0) router.push("/feedback/sent");
          else router.push("/feedback/invalid");
        }}
      />
    </Screen>
  );
}

export function SettingsScreen({ mode = "ready" }: { mode?: "ready" | "off" | "save-error" }) {
  const [logout, setLogout] = useState(false);
  const noticesOn = mode !== "off";
  return (
    <Screen tab="profile">
      <Title>Cài đặt</Title>
      <Card>
        <Body>{noticesOn ? "Thông báo biên lai và ca trực: bật" : "Thông báo biên lai và ca trực: tắt"}</Body>
        <Body muted>Địa điểm: TP. Hồ Chí Minh</Body>
      </Card>
      {mode === "save-error" ? (
        <Card>
          <Title>Không lưu được cài đặt</Title>
          <Body>Máy này giữ lựa chọn cũ. Thử lại khi có mạng.</Body>
          <Button label="Thử lưu lại" onPress={() => router.replace("/settings")} />
        </Card>
      ) : null}
      <Button
        label={noticesOn ? "Tắt thông báo" : "Bật thông báo"}
        tone="ghost"
        onPress={() => router.push(noticesOn ? "/settings/off" : "/settings")}
      />
      <Button label="Lưu thất bại" tone="ghost" onPress={() => router.push("/settings/save-error")} />
      <Button label="Đăng xuất" tone="danger" onPress={() => setLogout(true)} />
      <Button label="Đủ trạng thái nghiệp vụ" tone="ghost" onPress={() => router.push("/atlas")} />
      <Eyebrow>Các trạng thái trong bộ màn</Eyebrow>
      {(
        [
          ["/home/loading", "Trang chủ đang tải"],
          ["/home/offline", "Mất mạng"],
          ["/home/empty", "Không có kết quả"],
          ["/intake/rejected", "Kiểm định từ chối"],
          ["/profile/low", "Điểm thấp"],
          ["/transfer/transit", "Đang vận chuyển"],
          ["/distribution/exception", "Lệch bàn giao"],
          ["/volunteer/revision", "Hồ sơ TNV cần sửa"],
          ["/qr/error", "QR lỗi"],
          ["/receive/error", "Phiếu nhận lỗi"],
        ] as const
      ).map(([href, label]) => (
        <Button key={href} label={label} tone="ghost" onPress={() => router.push(href)} />
      ))}
      {logout ? (
        <Card>
          <Title>Đăng xuất khỏi máy này?</Title>
          <Body muted>Biên lai đã ký vẫn nằm trên hệ thống trạm.</Body>
          <Button label="Ở lại" onPress={() => setLogout(false)} />
          <Button label="Đăng xuất" tone="danger" onPress={() => router.replace("/otp/enter")} />
        </Card>
      ) : null}
    </Screen>
  );
}

export function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  return (
    <View style={{ flex: 1, backgroundColor: "rgba(7,36,26,0.45)", justifyContent: "flex-end", alignItems: "center" }}>
      <View style={{ width: "100%", maxWidth: 430, backgroundColor: colors.card, padding: 20, paddingBottom: insets.bottom + 20, gap: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
        <Title>Bạn muốn làm gì?</Title>
        <Button label="Mang đồ tới trạm" onPress={() => router.replace("/stations/map")} />
        <Button label="Đăng ký tình nguyện" tone="ghost" onPress={() => router.replace("/volunteer/form")} />
        {isOperator(user?.role) ? <Button label="Vận hành" tone="ghost" onPress={() => router.replace("/desk")} /> : null}
        <Button label="Xin nhận hỗ trợ" tone="ghost" onPress={() => router.replace("/receive/form")} />
        <Button label="Quét mã QR" tone="ghost" onPress={() => router.replace("/qr/scan")} />
        <Button label="Đóng" tone="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
}
