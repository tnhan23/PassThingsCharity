import { useEffect, useState } from "react";
import { View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import QRCode from "react-native-qrcode-svg";
import { ApiError } from "@/api/client";
import { backend } from "@/api/backend";
import { Body, Button, Card, Title } from "@/components/ui";

export type StationProof = { latitude: number; longitude: number; qrCode: string };

export function StationProofScan({
  title,
  onCancel,
  onDone,
}: {
  title: string;
  onCancel: () => void;
  onDone: (proof: StationProof) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [place, setPlace] = useState<{ latitude: number; longitude: number } | null>(null);
  const [placeError, setPlaceError] = useState("");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const current = await Location.requestForegroundPermissionsAsync();
      if (!current.granted) {
        if (live) setPlaceError("Cần quyền vị trí để xác nhận bạn đang đứng gần trạm.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (live) setPlace({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    })().catch(() => {
      if (live) setPlaceError("Không đọc được vị trí hiện tại.");
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <Card>
      <Title>{title}</Title>
      <Body muted>Đứng trong khoảng 500 mét quanh trạm rồi quét mã QR của trạm. Máy chủ chỉ ghi nhận khi vị trí và mã khớp.</Body>
      {placeError ? <Body>{placeError}</Body> : null}
      {place ? <Body muted>Đã lấy vị trí. Đưa mã QR vào khung.</Body> : placeError ? null : <Body muted>Đang lấy vị trí.</Body>}
      {!permission ? <Body muted>Đang hỏi quyền camera.</Body> : null}
      {permission && !permission.granted ? (
        <Button label={permission.canAskAgain ? "Cho phép camera" : "Mở Cài đặt để bật camera"} onPress={() => void requestPermission()} />
      ) : null}
      {permission?.granted && place ? (
        <View style={{ height: 240, borderRadius: 16, overflow: "hidden", backgroundColor: "#07241a" }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={paused ? undefined : (event) => {
              setPaused(true);
              onDone({ latitude: place.latitude, longitude: place.longitude, qrCode: event.data });
            }}
          />
        </View>
      ) : null}
      <Button label="Huỷ" tone="ghost" onPress={onCancel} />
    </Card>
  );
}

export function StationQrCard({ token, stationId }: { token: string; stationId: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setCode("");
    setError("");
    backend.stationQr(token, stationId)
      .then((data) => {
        if (live) setCode(data.data.qrCode);
      })
      .catch((reason: unknown) => {
        if (live) setError(reason instanceof ApiError ? reason.message : "Không lấy được mã QR trạm.");
      });
    return () => {
      live = false;
    };
  }, [token, stationId]);

  if (error) return <Body>{error}</Body>;
  if (!code) return <Body muted>Đang lấy mã QR trạm.</Body>;
  return (
    <Card>
      <Title>Mã QR trạm</Title>
      <Body muted>Nhân viên quét mã này khi vào ca, tan ca hoặc điểm danh việc. Mã chỉ hợp lệ khi họ đứng gần trạm.</Body>
      <View style={{ alignItems: "center", paddingVertical: 8 }}>
        <QRCode value={code} size={180} backgroundColor="#ffffff" color="#07241a" />
      </View>
    </Card>
  );
}
