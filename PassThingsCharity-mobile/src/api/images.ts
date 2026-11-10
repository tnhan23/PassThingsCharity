import * as ImagePicker from "expo-image-picker";
import type { UploadFile } from "@/api/client";

const kinds = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AllowedType = keyof typeof kinds;

function kindFromBase64(base64: string): AllowedType | null {
  const head = atob(base64.slice(0, 24));
  const bytes = Array.from(head, (char) => char.charCodeAt(0));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (head.startsWith("RIFF") && head.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function pickImage(): Promise<UploadFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Chưa cho phép mở thư viện ảnh.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsMultipleSelection: false,
    base64: true,
    quality: 0.7,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.base64) return null;
  const type = kindFromBase64(asset.base64);
  if (!type) {
    throw new Error("Chỉ chọn được một ảnh JPEG, PNG hoặc WebP.");
  }
  return {
    uri: asset.uri,
    name: `anh.${kinds[type]}`,
    type,
    base64: asset.base64,
  };
}
