import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ApiError } from "@/api/client";
import { useSession } from "@/api/session";
import { Screen } from "@/components/chrome";
import { Body, Button, Card, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

export default function LoginPage() {
  const { login, register } = useSession();
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      if (creating) {
        await register({ email, username, password, fullname, phone });
      } else {
        await login(username.trim(), password);
      }
      router.replace("/");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không đăng nhập được.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen tab="profile">
      <Title>{creating ? "Tạo tài khoản" : "Đăng nhập"}</Title>
      <Body muted>Máy chủ nhận username và mật khẩu. Mã OTP trên các màn minh họa chưa có API.</Body>
      <Card>
        {creating ? <Field label="Email" value={email} onChangeText={setEmail} keyboard="email-address" /> : null}
        {creating ? <Field label="Họ tên" value={fullname} onChangeText={setFullname} /> : null}
        {creating ? <Field label="Số điện thoại, 10 số" value={phone} onChangeText={setPhone} keyboard="phone-pad" /> : null}
        <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Field label="Mật khẩu" value={password} onChangeText={setPassword} secure />
        {error ? <Text style={{ fontFamily: fonts.medium, color: colors.error, fontSize: 14 }}>{error}</Text> : null}
        <Button label={busy ? "Đang gửi" : creating ? "Tạo và vào app" : "Vào app"} onPress={() => void submit()} />
      </Card>
      <Button
        label={creating ? "Đã có tài khoản" : "Chưa có tài khoản"}
        tone="ghost"
        onPress={() => {
          setCreating((value) => !value);
          setError("");
        }}
      />
      <Button label="Xem app không đăng nhập" tone="ghost" onPress={() => router.replace("/")} />
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secure,
  keyboard,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  keyboard?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboard ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        autoCorrect={false}
        style={{
          minHeight: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.hairline,
          backgroundColor: colors.surface,
          paddingHorizontal: 12,
          fontFamily: fonts.regular,
          fontSize: 16,
          color: colors.ink,
        }}
      />
    </View>
  );
}
