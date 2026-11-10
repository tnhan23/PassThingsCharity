import { router } from "expo-router";
import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Text, View } from "react-native";
import * as Location from "expo-location";
import type { StationRow } from "@/api/types";
import { Body, Button, Card, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

const NativeWebView = Platform.OS === "android"
  ? (require("react-native-webview") as typeof import("react-native-webview")).WebView
  : null;

type MapPoint = { latitude: number; longitude: number } & Pick<StationRow, "_id" | "name" | "address" | "imageUrl">;
type MapRoute = { id: string; coordinates: { latitude: number; longitude: number }[]; km: number };

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
  route: MapRoute | null,
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
  const routeLine = (route?.coordinates ?? []).map((point) => [point.latitude, point.longitude]);

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;700&display=swap">
  <style>
    html,body,#map{height:100%;width:100%;margin:0}
    body{font-family:"Be Vietnam Pro",sans-serif}
    .nearest-station-icon{background:transparent;border:0}
    .nearest-station-icon span{display:block;width:20px;height:20px;margin:6px;border:3px solid #fff;border-radius:50%;background:#198754;box-shadow:0 0 0 6px rgba(25,135,84,.28)}
    .leaflet-marker-icon.station-photo-icon{width:44px !important;height:44px !important;margin-left:-22px !important;margin-top:-22px !important;background:transparent !important;border:0 !important;border-radius:22px !important;overflow:hidden !important}
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
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
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
    const streets = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    });
    const relief = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri"
    });
    let tileErrors = 0;
    streets.on("tileerror", () => {
      tileErrors += 1;
      if (tileErrors < 3 || map.hasLayer(relief)) return;
      map.removeLayer(streets);
      relief.addTo(map);
    });
    streets.addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
    ${userLocation ? `L.circleMarker([${userLocation.latitude}, ${userLocation.longitude}], {
      radius: 9,
      color: "#ffffff",
      weight: 3,
      fillColor: "#2673e8",
      fillOpacity: 1
    }).addTo(map).bindPopup("Vị trí của bạn");` : ""}
    const routeLine = ${JSON.stringify(routeLine)};
    const markers = points.map((point) => {
      const nearest = point._id === ${JSON.stringify(nearestStationId)};
      let markerOptions = {};
      if (point.imageUrl) {
        const frame = document.createElement("div");
        const safeUrl = String(point.imageUrl).replace(/["\\\\()]/g, "");
        frame.style.cssText = [
          "width:44px",
          "height:44px",
          "border-radius:22px",
          "overflow:hidden",
          "box-sizing:border-box",
          "border:3px solid #fff",
          "background-color:#07241a",
          "background-position:center",
          "background-size:cover",
          "background-repeat:no-repeat",
          'background-image:url("' + safeUrl + '")',
          nearest ? "box-shadow:0 0 0 4px #198754" : "box-shadow:0 1px 3px rgba(7,36,26,.45)",
        ].join(";");
        markerOptions = {
          icon: L.divIcon({
            className: "station-photo-icon",
            html: frame.outerHTML,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          }),
          zIndexOffset: nearest ? 1000 : 0,
        };
      } else if (nearest) {
        markerOptions = { icon: L.divIcon({ className: "nearest-station-icon", html: "<span></span>", iconSize: [32, 32], iconAnchor: [16, 16] }), zIndexOffset: 1000 };
      }
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
    if (routeLine.length > 1) {
      const line = L.polyline(routeLine, { color: "#9d4225", weight: 5 }).addTo(map);
      map.fitBounds(line.getBounds().pad(0.2));
    } else if (!${Boolean(mapCenter)} && (markers.length > 1 || (${Boolean(userLocation)} && markers.length > 0))) {
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
  initialStationId = "",
}: {
  rows: StationRow[] | null;
  problem: string;
  onInteractionChange: (interacting: boolean) => void;
  initialStationId?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialStationId);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [openSettings, setOpenSettings] = useState(false);
  const [centerRequest, setCenterRequest] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [route, setRoute] = useState<MapRoute | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeProblem, setRouteProblem] = useState("");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const points = useMemo(() => (rows ?? []).flatMap((station): MapPoint[] => {
    const coordinates = stationCoordinates(station);
    return coordinates ? [{ ...station, ...coordinates }] : [];
  }), [rows]);
  const focusedStation = points.find((point) => point._id === initialStationId) ?? null;
  const nearestStation = useMemo(() => {
    if (!userLocation || points.length === 0) return null;
    return points.reduce((nearest, point) => (
      distanceBetween(userLocation, point) < distanceBetween(userLocation, nearest) ? point : nearest
    ));
  }, [points, userLocation]);
  const initialCenter = useMemo(
    () => mapCenter ?? (focusedStation
      ? { latitude: focusedStation.latitude, longitude: focusedStation.longitude }
      : null),
    [mapCenter, focusedStation],
  );
  const html = useMemo(
    () => stationMapHtml(points, userLocation, nearestStation?._id ?? null, initialCenter, centerRequest, route),
    [points, userLocation, nearestStation, initialCenter, centerRequest, route],
  );
  const photoKey = points.map((point) => `${point._id}:${point.imageUrl ?? ""}`).join("|");
  const mapRenderKey = `tiles3:${initialStationId}:${nearestStation?._id ?? ""}:${userLocation?.latitude ?? ""}:${userLocation?.longitude ?? ""}:${centerRequest}:${route?.id ?? ""}:${route?.coordinates.length ?? 0}:${photoKey}`;
  const selected = points.find((point) => point._id === selectedId) ?? nearestStation;

  useEffect(() => {
    setSelectedId(initialStationId);
    setRoute(null);
    setRouteProblem("");
  }, [initialStationId]);

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

  function chooseStation(id: string) {
    setSelectedId(id);
    setRoute((current) => (current?.id === id ? current : null));
    setRouteProblem("");
  }

  async function currentOrigin() {
    if (userLocation) return userLocation;
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setLocationStatus(permission.canAskAgain
        ? "Cần quyền vị trí để tạo đường đi từ vị trí hiện tại."
        : "Quyền vị trí đã bị tắt. Hãy bật quyền trong cài đặt ứng dụng.");
      setOpenSettings(!permission.canAskAgain);
      return null;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const origin = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    setUserLocation(origin);
    return origin;
  }

  async function drawRoute() {
    if (!selected) return;
    if (route?.id === selected._id) {
      setRoute(null);
      setRouteProblem("");
      return;
    }
    setRouteBusy(true);
    setRouteProblem("");
    setLocationStatus("");
    setOpenSettings(false);
    try {
      const origin = await currentOrigin();
      if (!origin) return;
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${selected.longitude},${selected.latitude}?overview=full&geometries=geojson`,
      );
      if (!response.ok) throw new Error("route");
      const data = (await response.json()) as { routes?: { distance?: number; geometry?: { coordinates?: [number, number][] } }[] };
      const line = data.routes?.[0]?.geometry?.coordinates;
      if (!line?.length) throw new Error("route");
      setMapReady(false);
      setRoute({
        id: selected._id,
        coordinates: line.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
        km: (data.routes?.[0]?.distance ?? 0) / 1000,
      });
    } catch {
      setRoute(null);
      setRouteProblem("Chưa vẽ được đường đi. Bạn vẫn mở Google Maps để dẫn đường.");
    } finally {
      setRouteBusy(false);
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

      const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${origin.latitude},${origin.longitude}`)}&destination=${encodeURIComponent(`${selected.latitude},${selected.longitude}`)}`;
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
        chooseStation(message.id);
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
                    source={{ html, baseUrl: "https://tile.openstreetmap.org/" }}
                    userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                    mixedContentMode="always"
                    javaScriptEnabled
                    scrollEnabled={false}
                    nestedScrollEnabled={Platform.OS === "android"}
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
                        chooseStation(message.id);
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
          {route?.id === selected._id ? <Body muted>{`Đường đi khoảng ${route.km.toFixed(1)} km`}</Body> : null}
          {routeProblem ? <Body>{routeProblem}</Body> : null}
          <Button
            label={routeBusy ? "Đang tìm đường…" : route?.id === selected._id ? "Ẩn đường đi" : "Vẽ đường đi trên bản đồ"}
            disabled={routeBusy}
            onPress={() => void drawRoute()}
          />
          <Button
            label={locationBusy ? "Đang mở đường đi…" : "Mở Google Maps"}
            tone="ghost"
            disabled={locationBusy}
            onPress={() => void viewRouteToSelectedStation()}
          />
          <Button label="Xem chi tiết" tone="ghost" onPress={() => router.push(`/station/${selected._id}`)} />
        </Card>
      ) : null}
      <Body muted>Bản đồ © OpenStreetMap contributors.</Body>
    </View>
  );
}

export function StationLeafletPeek({ station }: { station: StationRow }) {
  const latitude = Number(station.latitude);
  const longitude = Number(station.longitude);
  if (!NativeWebView || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return <Body muted>Chưa có tọa độ để mở bản đồ trạm.</Body>;
  }
  const html = `<!doctype html>
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
    const map = L.map("map", { zoomControl: false, attributionControl: false }).setView([${latitude}, ${longitude}], 16);
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
    L.circleMarker([${latitude}, ${longitude}], { radius: 10, color: "#ffffff", weight: 3, fillColor: "#07241a", fillOpacity: 1 }).addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
  </script>
</body>
</html>`;
  return (
    <View style={{ height: 168, borderRadius: 14, overflow: "hidden" }}>
      <NativeWebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://tile.openstreetmap.org/" }}
        userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        javaScriptEnabled
        scrollEnabled={false}
        style={{ flex: 1, backgroundColor: colors.surfaceContainer }}
      />
    </View>
  );
}
