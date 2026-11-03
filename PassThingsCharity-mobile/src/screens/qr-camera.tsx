import { useState } from "react";
import { View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Body, Button, Card, Title } from "@/components/ui";

export function LiveQr() {
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState("");
  const [paused, setPaused] = useState(false);

  if (!permission) {
    return <Body muted>Đang hỏi quyền camera.</Body>;
  }

  if (!permission.granted) {
    return (
      <Card>
        <Title>Cần quyền camera</Title>
        <Body>App cần camera để đọc mã QR. Mã chỉ hiện trên màn này. Máy chủ chưa nhận và chưa tính ca.</Body>
        <Button
          label={permission.canAskAgain ? "Cho phép camera" : "Mở Cài đặt để bật camera"}
          onPress={() => void requestPermission()}
        />
      </Card>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ height: 320, borderRadius: 18, overflow: "hidden", backgroundColor: "#07241a" }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={paused ? undefined : (event) => {
            setCode(event.data);
            setPaused(true);
          }}
        />
      </View>
      <Body muted>Đưa mã vào khung. Đây là bản demo trên giao diện. Máy chủ chưa kiểm tra mã và chưa ghi nhận ca.</Body>
      {code ? (
        <Card>
          <Title>Đã đọc mã</Title>
          <Body>{code}</Body>
        </Card>
      ) : (
        <Body muted>Chưa đọc được mã nào.</Body>
      )}
      {paused ? (
        <Button
          label="Quét mã khác"
          onPress={() => {
            setCode("");
            setPaused(false);
          }}
        />
      ) : null}
    </View>
  );
}
