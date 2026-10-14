import { router } from "expo-router";
import { useState } from "react";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { useSession } from "@/api/session";
import { Screen } from "@/components/chrome";
import { Field } from "@/components/form";
import { Body, Button, Card, Title } from "@/components/ui";

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
          label="Đổi mật khẩu"
          onPress={() => {
            void backend
              .changePassword(token, { currentPassword, newPassword })
              .then((data) => setMessage(data.message))
              .catch((caught) => setMessage(caught instanceof ApiError ? caught.message : "Không đổi được mật khẩu."));
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
          label="Lưu hồ sơ"
          onPress={() => {
            const body: Record<string, string> = {};
            if (email.trim()) body.email = email.trim();
            if (username.trim()) body.username = username.trim();
            if (fullName.trim()) body.fullName = fullName.trim();
            if (phone.trim()) body.phone = phone.trim();
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
              .catch((caught) => setMessage(caught instanceof ApiError ? caught.message : "Không lưu được hồ sơ."));
          }}
        />
      </Card>
      <Card>
        <Title>Xóa tài khoản</Title>
        <Body muted>DELETE /users/:id. Chỉ xóa đúng tài khoản đang đăng nhập.</Body>
        <Field label="Mật khẩu xác nhận" value={deletePassword} onChangeText={setDeletePassword} secure />
        <Button
          label="Xóa tài khoản"
          tone="danger"
          onPress={() => {
            void backend
              .deleteAccount(token, user.id, deletePassword)
              .then(async () => {
                await logout();
                router.replace("/login");
              })
              .catch((caught) => setMessage(caught instanceof ApiError ? caught.message : "Không xóa được tài khoản."));
          }}
        />
      </Card>
    </Screen>
  );
}
