import * as ImagePicker from "expo-image-picker";
import type { UploadFile } from "@/api/client";

export async function pickImages(): Promise<UploadFile[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Chưa cho phép mở thư viện ảnh.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsMultipleSelection: true,
    selectionLimit: 5,
    quality: 0.7,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, 5).map((asset, index) => ({
    uri: asset.uri,
    name: asset.fileName || `anh-${index + 1}.jpg`,
    type: asset.mimeType || "image/jpeg",
  }));
}
