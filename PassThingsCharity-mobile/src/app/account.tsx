import { router } from "expo-router";
import { useEffect, useState } from "react";
import { backend } from "@/api/backend";
import { pickImages } from "@/api/images";
import { ApiError } from "@/api/client";
import { useSession } from "@/api/session";
import { Screen } from "@/components/chrome";
import { Field } from "@/components/form";
import { Body, Button, Card, Photo, Title } from "@/components/ui";

export default function AccountPage() {
  const { token, user, patchUser, logout } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(user?.username ?? "");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState("");
  const [task, setTask] = useState("");
  const [photos, setPhotos] = useState<string[]>(user?.avatarUrl ? [user.avatarUrl] : []);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username ?? "");
    setFullName(user.fullName ?? "");
    setPhone(user.phone ?? "");
    setEmail(user.email ?? "");
  }, [user]);

  if (!token || !user) {
    return (
      <Screen tab="profile">
        <Title>Tài khoản</Title>
        <Body>Đăng nhập để đổi mật khẩu, sửa hồ sơ, hoặc xóa tài khoản.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  return (
    <Screen tab="profile">
      <Title>Tài khoản</Title>
      <Body muted>{`User id ${user.id}`}</Body>
      {message ? <Body>{message}</Body> : null}
      <Card>
        <Title>Đổi mật khẩu</Title>
        <Body muted>PATCH /auth/change-password. Mật khẩu mới từ 8 ký tự.</Body>
        <Field label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} secure />
        <Field label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} secure />
        <Button
          disabled={task !== ""}
          label={task === "password" ? "Đang gửi" : "Đổi mật khẩu"}
          onPress={() => {
            if (task) return;
            setTask("password");
            setMessage("");
            void backend
              .changePassword(token, { currentPassword, newPassword })
              .then((data) => setMessage(data.message))
              .catch((caught) => setMessage(caught instanceof ApiError ? caught.message : "Không đổi được mật khẩu."))
              .finally(() => setTask(""));
          }}
        />
      </Card>
      <Card>
        <Title>Sửa hồ sơ</Title>
        <Body muted>PATCH /users/me/profile. Gửi ít nhất một trường.</Body>
        <Field label="Email" value={email} onChangeText={setEmail} />
        <Field label="Username" value={username} onChangeText={setUsername} />
        <Field label="Họ tên" value={fullName} onChangeText={setFullName} />
        <Field label="Số điện thoại" value={phone} onChangeText={setPhone} />
        <Button
          disabled={task !== ""}
          label={task === "profile" ? "Đang gửi" : "Lưu hồ sơ"}
          onPress={() => {
            if (task) return;
            const body: Record<string, string> = {};
            if (email.trim()) body.email = email.trim();
            if (username.trim()) body.username = username.trim();
            if (fullName.trim()) body.fullName = fullName.trim();
            if (phone.trim()) body.phone = phone.trim();
            setTask("profile");
            setMessage("");
            void backend
              .updateProfile(token, body)
              .then((data) => {
                patchUser({
                  username: data.user.username,
                  phone: data.user.phone,
                  email: data.user.email,
                  fullName: data.user.fullName,
                  role: data.user.role,
                });
                setMessage(data.message);
              })
              .catch((caught) => setMessage(caught instanceof ApiError ? caught.message : "Không lưu được hồ sơ."))
              .finally(() => setTask(""));
          }}
        />
      </Card>
      <Card>
        <Title>Ảnh hồ sơ</Title>
        <Body muted>Ảnh đầu tiên được lưu làm ảnh tài khoản. Các ảnh sau vẫn hiện ở đây.</Body>
        {photos.length === 0 ? <Body muted>Chưa có ảnh. Lần tải trước chưa được lưu vào hồ sơ, hãy chọn lại.</Body> : null}
        {photos.map((uri) => (
          <Photo key={uri} uri={uri} height={180} radius={16} />
        ))}
        <Button
          disabled={task !== ""}
          label={task === "photo" ? "Đang gửi" : "Tải ảnh hồ sơ"}
          onPress={() => {
            if (task) return;
            setTask("photo");
            setMessage("");
            void (async () => {
              const files = await pickImages();
              if (!files.length) return "Chưa chọn ảnh.";
              const uploaded = await backend.uploadPersonalImages(token, files);
              const urls = uploaded.imageUrls ?? [];
              if (!urls.length) return "Cloudinary không trả đường dẫn.";
              const saved = await backend.updateProfile(token, { avatarUrl: urls[0] });
              patchUser({ avatarUrl: saved.user.avatarUrl || urls[0] });
              setPhotos(urls);
              return "Đã lưu ảnh hồ sơ.";
            })()
              .then((text) => setMessage(text))
              .catch((caught) => setMessage(caught instanceof Error ? caught.message : "Không tải được ảnh."))
              .finally(() => setTask(""));
          }}
        />
      </Card>
      <Card>
        <Title>Xóa tài khoản</Title>
        <Body muted>DELETE /users/:id. Chỉ xóa đúng tài khoản đang đăng nhập.</Body>
        <Field label="Mật khẩu xác nhận" value={deletePassword} onChangeText={setDeletePassword} secure />
        <Button
          disabled={task !== ""}
          label={task === "delete" ? "Đang gửi" : "Xóa tài khoản"}
          tone="danger"
          onPress={() => {
            if (task) return;
            setTask("delete");
            setMessage("");
            void backend
              .deleteAccount(token, user.id, deletePassword)
              .then(async () => {
                await logout();
                router.replace("/login");
              })
              .catch((caught) => setMessage(caught instanceof ApiError ? caught.message : "Không xóa được tài khoản."))
              .finally(() => setTask(""));
          }}
        />
      </Card>
    </Screen>
  );
}
