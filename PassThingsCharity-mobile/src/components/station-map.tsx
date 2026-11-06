import { router } from "expo-router";
import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Text, View } from "react-native";
import * as Location from "expo-location";
import type { StationRow } from "@/api/types";
import { Body, Button, Card, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

const NativeWebView = Platform.OS === "web"
  ? null
  : (require("react-native-webview") as typeof import("react-native-webview")).WebView;

type MapPoint = { latitude: number; longitude: number } & Pick<StationRow, "_id" | "name" | "address">;

function stationCoordinates(station: StationRow): { latitude: number; longitude: number } | null {
  if (station.latitude == null || station.longitude == null) return null;
  const latitude = Number(station.latitude);
  const longitude = Number(station.longitude);
  if (
    !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
    || !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
  ) return null;
  return { latitude, longitude };
}

function distanceBetween(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(first.latitude))
    * Math.cos(radians(second.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function stationMapHtml(
  points: MapPoint[],
  userLocation: { latitude: number; longitude: number } | null,
  nearestStationId: string | null,
  mapCenter: { latitude: number; longitude: number } | null,
  centerRequest: number,
) {
  const serializedPoints = JSON.stringify(points)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const initialCenter = mapCenter
    ? [mapCenter.latitude, mapCenter.longitude]
    : points.length
      ? [points[0].latitude, points[0].longitude]
      : userLocation
        ? [userLocation.latitude, userLocation.longitude]
        : [10.7769, 106.7009];

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html,body,#map{height:100%;width:100%;margin:0}
    body{font-family:Arial,sans-serif}
    .nearest-station-icon{background:transparent;border:0}
    .nearest-station-icon span{display:block;width:20px;height:20px;margin:6px;border:3px solid #fff;border-radius:50%;background:#198754;box-shadow:0 0 0 6px rgba(25,135,84,.28)}
  </style>
</head>
<body>
  <div id="map" data-center-request="${centerRequest}"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const points = ${serializedPoints};
    const reportTouchInteraction = !window.ReactNativeWebView;
    let activePointers = 0;
    let mapMoving = false;
    let releaseTimer = null;
    function reportInteraction(active) {
      const message = JSON.stringify({ type: "station-map-interaction", active });
      if (window.parent !== window) window.parent.postMessage(JSON.parse(message), "*");
    }
    function releaseInteractionWhenIdle() {
      if (!reportTouchInteraction) return;
      if (releaseTimer) clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => {
        if (activePointers === 0 && !mapMoving) reportInteraction(false);
      }, 500);
    }
    if (reportTouchInteraction) {
      document.addEventListener("pointerdown", () => {
        activePointers += 1;
        if (releaseTimer) clearTimeout(releaseTimer);
        reportInteraction(true);
      }, true);
      document.addEventListener("pointerup", () => {
        activePointers = Math.max(0, activePointers - 1);
        releaseInteractionWhenIdle();
      }, true);
      document.addEventListener("pointercancel", () => {
        activePointers = Math.max(0, activePointers - 1);
        releaseInteractionWhenIdle();
      }, true);
    }
    window.addEventListener("blur", () => {
      activePointers = 0;
      mapMoving = false;
      releaseInteractionWhenIdle();
    });
    const map = L.map("map").setView(${JSON.stringify(initialCenter)}, ${mapCenter ? 16 : 13});
    map.on("movestart zoomstart", () => {
      if (!reportTouchInteraction || activePointers === 0) return;
      mapMoving = true;
      if (releaseTimer) clearTimeout(releaseTimer);
    });
    map.on("moveend zoomend", () => {
      if (!reportTouchInteraction) return;
      mapMoving = false;
      releaseInteractionWhenIdle();
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);
    ${userLocation ? `L.circleMarker([${userLocation.latitude}, ${userLocation.longitude}], {
      radius: 9,
      color: "#ffffff",
      weight: 3,
      fillColor: "#2673e8",
      fillOpacity: 1
    }).addTo(map).bindPopup("Vị trí của bạn");` : ""}
    const markers = points.map((point) => {
      const markerOptions = point._id === ${JSON.stringify(nearestStationId)}
        ? { icon: L.divIcon({ className: "nearest-station-icon", html: "<span></span>", iconSize: [32, 32], iconAnchor: [16, 16] }), zIndexOffset: 1000 }
        : {};
      const marker = L.marker([point.latitude, point.longitude], markerOptions).addTo(map);
      const popup = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = point.name;
      const address = document.createElement("div");
      address.textContent = point.address;
      popup.append(title, address);
      marker.bindPopup(popup);
      marker.on("click", () => {
        const message = JSON.stringify({ type: "station-select", id: point._id });
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
        if (window.parent !== window) window.parent.postMessage(JSON.parse(message), "*");
      });
      return marker;
    });
    ${userLocation ? `const userMarker = L.circleMarker([${userLocation.latitude}, ${userLocation.longitude}], {
      radius: 9,
      color: "#ffffff",
      weight: 3,
      fillColor: "#2673e8",
      fillOpacity: 1
    }).addTo(map).bindPopup("Vị trí của bạn");` : ""}
    if (!${Boolean(mapCenter)} && (markers.length > 1 || (${Boolean(userLocation)} && markers.length > 0))) {
      const visibleMarkers = ${userLocation ? "[...markers, userMarker]" : "markers"};
      map.fitBounds(L.featureGroup(visibleMarkers).getBounds().pad(0.15), { maxZoom: 15 });
    } else if (!${Boolean(mapCenter)} && markers.length === 1 && !${Boolean(userLocation)}) {
      map.setView(markers[0].getLatLng(), 15);
    }
  </script>
</body>
</html>`;
}

export function StationMap({
  rows,
  problem,
  onInteractionChange,
}: {
  rows: StationRow[] | null;
  problem: string;
  onInteractionChange: (interacting: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [openSettings, setOpenSettings] = useState(false);
  const [centerRequest, setCenterRequest] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const points = useMemo(() => (rows ?? []).flatMap((station): MapPoint[] => {
    const coordinates = stationCoordinates(station);
    return coordinates ? [{ ...station, ...coordinates }] : [];
  }), [rows]);
  const nearestStation = useMemo(() => {
    if (!userLocation || points.length === 0) return null;
    return points.reduce((nearest, point) => (
      distanceBetween(userLocation, point) < distanceBetween(userLocation, nearest) ? point : nearest
    ));
  }, [points, userLocation]);
  const html = useMemo(
    () => stationMapHtml(points, userLocation, nearestStation?._id ?? null, mapCenter, centerRequest),
    [points, userLocation, nearestStation, mapCenter, centerRequest],
  );
  const mapRenderKey = `${nearestStation?._id ?? ""}:${userLocation?.latitude ?? ""}:${userLocation?.longitude ?? ""}:${centerRequest}`;
  const selected = points.find((point) => point._id === selectedId) ?? nearestStation;

  useEffect(() => {
    let cancelled = false;
    async function loadLocationIfAllowed() {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      } catch (caught) {
        if (!cancelled) {
          setLocationStatus(caught instanceof Error ? `Không lấy được vị trí: ${caught.message}` : "Không lấy được vị trí hiện tại.");
        }
      }
    }
    void loadLocationIfAllowed();
    return () => {
      cancelled = true;
    };
  }, []);

  async function allowLocation() {
    setLocationBusy(true);
    setLocationStatus("");
    setOpenSettings(false);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationStatus(permission.canAskAgain
          ? "Chưa được cấp quyền vị trí. Bạn có thể thử lại."
          : "Quyền vị trí đã bị tắt. Hãy bật quyền trong cài đặt ứng dụng.");
        setOpenSettings(!permission.canAskAgain);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserLocation(location);
      const closestStation = points.reduce<MapPoint | null>((nearest, point) => (
        !nearest || distanceBetween(location, point) < distanceBetween(location, nearest) ? point : nearest
      ), null);
      setSelectedId(closestStation?._id ?? "");
      setLocationStatus("Đã lấy vị trí. Bấm nút bên dưới để đưa bản đồ tới vị trí của bạn.");
    } catch (caught) {
      setLocationStatus(caught instanceof Error ? `Không lấy được vị trí: ${caught.message}` : "Không lấy được vị trí hiện tại.");
    } finally {
      setLocationBusy(false);
    }
  }

  async function viewRouteToSelectedStation() {
    if (!selected) return;
    setLocationBusy(true);
    setLocationStatus("");
    setOpenSettings(false);
    try {
      let origin = userLocation;
      if (!origin) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setLocationStatus(permission.canAskAgain
            ? "Cần quyền vị trí để tạo đường đi từ vị trí hiện tại."
            : "Quyền vị trí đã bị tắt. Hãy bật quyền trong cài đặt ứng dụng.");
          setOpenSettings(!permission.canAskAgain);
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        origin = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(origin);
      }

      const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${origin.latitude},${origin.longitude}`)}&destination=${encodeURIComponent(selected.address)}`;
      await Linking.openURL(url);
    } catch (caught) {
      setLocationStatus(caught instanceof Error
        ? `Không thể mở đường đi trên Google Maps: ${caught.message}`
        : "Không thể mở đường đi trên Google Maps.");
    } finally {
      setLocationBusy(false);
    }
  }

  async function goToLocationSettings() {
    try {
      await Linking.openSettings();
    } catch (caught) {
      setLocationStatus(caught instanceof Error ? `Không mở được cài đặt: ${caught.message}` : "Không mở được cài đặt ứng dụng.");
    }
  }

  function setInteracting(interacting: boolean) {
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    if (interacting) {
      onInteractionChange(true);
      interactionTimer.current = setTimeout(() => onInteractionChange(false), 15000);
    } else {
      interactionTimer.current = setTimeout(() => onInteractionChange(false), 700);
    }
  }

  useEffect(() => () => {
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    onInteractionChange(false);
  }, [onInteractionChange]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const message: unknown = event.data;
      if (!message || typeof message !== "object" || !("type" in message)) return;
      if (message.type === "station-map-interaction" && "active" in message && typeof message.active === "boolean") {
        setInteracting(message.active);
      }
      if (message.type === "station-select" && "id" in message && typeof message.id === "string") {
        setSelectedId(message.id);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onInteractionChange]);

  return (
    <View style={{ gap: 12 }}>
      {problem || !rows ? (
        <Card>
          <Title>{problem ? "Không tải được trạm" : "Đang tải trạm"}</Title>
          <Body>{problem || "Máy chủ không trả danh sách."}</Body>
        </Card>
      ) : rows.length === 0 ? (
        <Card><Title>Chưa có trạm trên bản đồ</Title><Body>Chiến dịch này chưa gán trạm.</Body></Card>
      ) : (
        <>
          {points.length < rows.length ? <Body muted>{`Chưa có tọa độ hợp lệ cho ${rows.length - points.length} trạm. Các trạm còn lại vẫn hiển thị.`}</Body> : null}
          {points.length === 0 ? (
            <Card><Title>Chưa có tọa độ trạm</Title><Body>Thêm vĩ độ và kinh độ hợp lệ cho trạm để hiển thị vị trí trên bản đồ.</Body></Card>
          ) : (
            <View
              style={{ height: 420, overflow: "hidden", borderRadius: 18, backgroundColor: colors.surfaceContainer }}
              onTouchStartCapture={() => {
                if (Platform.OS !== "web") setInteracting(true);
              }}
              onTouchEndCapture={(event) => {
                if (Platform.OS !== "web" && event.nativeEvent.touches.length === 0) setInteracting(false);
              }}
              onTouchCancelCapture={() => {
                if (Platform.OS !== "web") setInteracting(false);
              }}
            >
              {!NativeWebView
                ? createElement("iframe", {
                    key: mapRenderKey,
                    title: "Bản đồ trạm",
                    srcDoc: html,
                    ref: iframeRef,
                    onLoad: () => setMapReady(true),
                    style: { height: "100%", width: "100%", border: 0 },
                  })
                : (
                  <NativeWebView
                    key={mapRenderKey}
                    originWhitelist={["*"]}
                    source={{ html }}
                    javaScriptEnabled
                    scrollEnabled={false}
                    onLoadEnd={() => setMapReady(true)}
                    onMessage={(event) => {
                      let message: unknown;
                      try {
                        message = JSON.parse(event.nativeEvent.data);
                      } catch {
                        return;
                      }
                      if (!message || typeof message !== "object" || !("type" in message)) return;
                      if (message.type === "station-map-interaction" && "active" in message && typeof message.active === "boolean") {
                        setInteracting(message.active);
                      }
                      if (message.type === "station-select" && "id" in message && typeof message.id === "string") {
                        setSelectedId(message.id);
                      }
                    }}
                    style={{ flex: 1, backgroundColor: colors.surfaceContainer }}
                  />
                )}
            </View>
          )}
        </>
      )}
      <View style={{ gap: 8 }}>
        <Button
          label={locationBusy ? "Đang lấy vị trí…" : userLocation ? "Cập nhật vị trí của tôi" : "Cho phép truy cập vị trí"}
          disabled={locationBusy}
          onPress={() => void allowLocation()}
        />
        {openSettings && Platform.OS !== "web" ? <Button label="Mở cài đặt vị trí" tone="ghost" onPress={() => void goToLocationSettings()} /> : null}
        <Button
          label="Đưa bản đồ về vị trí hiện tại"
          tone="ghost"
          disabled={!userLocation || !mapReady}
          onPress={() => {
            if (!userLocation) return;
            setMapReady(false);
            setMapCenter({ ...userLocation });
            setCenterRequest((request) => request + 1);
          }}
        />
        {locationBusy ? <ActivityIndicator color={colors.primary} /> : null}
        {locationStatus ? <Body muted>{locationStatus}</Body> : null}
      </View>
      {selected ? (
        <Card>
          {selected._id === nearestStation?._id ? <Body muted>Trạm gần bạn nhất</Body> : null}
          <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.ink }}>{selected.name}</Text>
          <Body muted>{selected.address}</Body>
          <Button
            label={locationBusy ? "Đang mở đường đi…" : "Xem đường đi trên Google Maps"}
            tone="ghost"
            disabled={locationBusy}
            onPress={() => void viewRouteToSelectedStation()}
          />
          <Button label="Xem chi tiết" tone="ghost" onPress={() => router.push(`/station/${selected._id}`)} />
        </Card>
      ) : null}
      <Body muted>Bản đồ được cung cấp bởi OpenStreetMap contributors.</Body>
    </View>
  );
}
