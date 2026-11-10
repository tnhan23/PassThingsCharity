import { router } from "expo-router";
import { useEffect, useState } from "react";
import { backend } from "@/api/backend";
import { pickImage } from "@/api/images";
import { ApiError } from "@/api/client";
import { useGuest } from "@/api/guest";
import { useSession } from "@/api/session";
import { toastToneFromError, useToast } from "@/api/toast";
import { Screen } from "@/components/chrome";
import { Field } from "@/components/form";
import { Body, Button, Card, Photo, Title } from "@/components/ui";

export default function AccountPage() {
  const { token, user, patchUser, logout } = useSession();
  const { leaveGuest } = useGuest();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(user?.username ?? "");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [deletePassword, setDeletePassword] = useState("");
  const [task, setTask] = useState("");
  const [avatar, setAvatar] = useState(user?.avatarUrl ?? "");

  function showFeedback(_section: "password" | "profile" | "photo" | "delete", text: string, err: boolean) {
    toast.show(text, toastToneFromError(err));
  }

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
      <Card>
        <Title>Đổi mật khẩu</Title>
        <Body muted>Mật khẩu mới từ 8 ký tự.</Body>
        <Field label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} secure />
        <Field label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} secure />
        <Button
          disabled={task !== ""}
          label={task === "password" ? "Đang gửi" : "Đổi mật khẩu"}
          onPress={() => {
            if (task) return;
            if (!currentPassword || !newPassword) {
              showFeedback("password", "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.", true);
              return;
            }
            if (newPassword.length < 8) {
              showFeedback("password", "Mật khẩu mới phải có ít nhất 8 ký tự.", true);
              return;
            }
            if (currentPassword === newPassword) {
              showFeedback("password", "Mật khẩu mới phải khác mật khẩu hiện tại.", true);
              return;
            }
            setTask("password");
            void backend
              .changePassword(token, { currentPassword, newPassword })
              .then((data) => showFeedback("password", data.message, false))
              .catch((caught) => showFeedback("password", caught instanceof ApiError ? caught.message : "Không đổi được mật khẩu.", true))
              .finally(() => setTask(""));
          }}
        />
      </Card>
      <Card>
        <Title>Sửa hồ sơ</Title>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Username" value={username} onChangeText={setUsername} />
        <Field label="Họ tên" value={fullName} onChangeText={setFullName} />
        <Field label="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button
          disabled={task !== ""}
          label={task === "profile" ? "Đang gửi" : "Lưu hồ sơ"}
          onPress={() => {
            if (task) return;
            if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
              showFeedback("profile", "Email không đúng định dạng (ví dụ: ten@email.com).", true);
              return;
            }
            if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
              showFeedback("profile", "Số điện thoại phải gồm đúng 10 chữ số.", true);
              return;
            }
            const body: Record<string, string> = {};
            if (email.trim()) body.email = email.trim();
            if (username.trim()) body.username = username.trim();
            if (fullName.trim()) body.fullName = fullName.trim();
            if (phone.trim()) body.phone = phone.trim();
            if (Object.keys(body).length === 0) {
              showFeedback("profile", "Vui lòng điền ít nhất một thông tin hồ sơ cần cập nhật.", true);
              return;
            }
            setTask("profile");
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
                showFeedback("profile", data.message, false);
              })
              .catch((caught) => showFeedback("profile", caught instanceof ApiError ? caught.message : "Không lưu được hồ sơ.", true))
              .finally(() => setTask(""));
          }}
        />
      </Card>
      <Card>
        <Title>Ảnh hồ sơ</Title>
        <Body muted>Chọn một ảnh JPEG, PNG hoặc WebP. Ảnh được tải lên trước, rồi mới lưu vào hồ sơ.</Body>
        {avatar ? <Photo uri={avatar} height={96} width={96} radius={48} /> : <Body muted>Chưa có ảnh hồ sơ.</Body>}
        <Button
          disabled={task !== ""}
          label={task === "photo" ? "Đang gửi" : "Đổi ảnh hồ sơ"}
          onPress={() => {
            if (task) return;
            setTask("photo");
            void (async () => {
              const file = await pickImage();
              if (!file) return { text: "Chưa chọn ảnh.", err: true };
              const uploaded = await backend.uploadAvatar(token, file);
              if (!uploaded.avatarUrl) return { text: "Máy chủ không trả đường dẫn ảnh.", err: true };
              const saved = await backend.updateProfile(token, { avatarUrl: uploaded.avatarUrl });
              const next = saved.user.avatarUrl || uploaded.avatarUrl;
              patchUser({ avatarUrl: next });
              setAvatar(next);
              return { text: "Đã lưu ảnh hồ sơ.", err: false };
            })()
              .then((res) => showFeedback("photo", res.text, res.err))
              .catch((caught) => showFeedback("photo", caught instanceof Error ? caught.message : "Không tải được ảnh.", true))
              .finally(() => setTask(""));
          }}
        />
      </Card>
      <Card>
        <Title>Xóa tài khoản</Title>
        <Body muted>Chỉ xóa đúng tài khoản đang đăng nhập.</Body>
        <Field label="Mật khẩu xác nhận" value={deletePassword} onChangeText={setDeletePassword} secure />
        <Button
          disabled={task !== ""}
          label={task === "delete" ? "Đang gửi" : "Xóa tài khoản"}
          tone="danger"
          onPress={() => {
            if (task) return;
            if (!deletePassword) {
              showFeedback("delete", "Vui lòng nhập mật khẩu xác nhận để xóa tài khoản.", true);
              return;
            }
            setTask("delete");
            void backend
              .deleteAccount(token, user.id, deletePassword)
              .then(async () => {
                leaveGuest();
                await logout();
                router.replace("/login");
              })
              .catch((caught) => showFeedback("delete", caught instanceof ApiError ? caught.message : "Không xóa được tài khoản.", true))
              .finally(() => setTask(""));
          }}
        />
      </Card>
    </Screen>
  );
}
