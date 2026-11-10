import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { useGuest } from "@/api/guest";
import { useLocale } from "@/api/locale";
import { useSession } from "@/api/session";
import { useToast } from "@/api/toast";
import { PasswordReset } from "@/components/form";
import { Body, Button, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

export default function LoginPage() {
  const { ready, user, login, register, open } = useSession();
  const { guest, enterGuest } = useGuest();
  const { t } = useLocale();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<"login" | "register" | "forgot" | "gmail" | null>(null);
  const [gmailNew, setGmailNew] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const gmailForm = form === "gmail";

  if (ready && user) return <Redirect href="/" />;

  function fail(message: string) {
    toast.show(message, "error");
  }

  async function submit() {
    if (busy) return;
    if (form === "register") {
      if (!email.trim() || !fullname.trim() || !phone.trim() || !username.trim() || !password) {
        fail("Vui lòng điền đủ email, họ tên, số điện thoại, tên đăng nhập và mật khẩu.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        fail("Email không đúng định dạng.");
        return;
      }
      if (!/^\d{10}$/.test(phone.trim())) {
        fail("Số điện thoại phải gồm đúng 10 chữ số.");
        return;
      }
      if (password.length < 6) {
        fail("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }
    } else if (!username.trim() || !password) {
      fail("Vui lòng nhập đủ tên đăng nhập và mật khẩu.");
      return;
    }
    if (form === "register") {
      if (!email.trim() || !fullname.trim() || !phone.trim() || !username.trim() || !password) {
        fail("Vui lòng điền đầy đủ email, họ tên, số điện thoại, tên đăng nhập và mật khẩu.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        fail("Email không đúng định dạng (ví dụ: ten@email.com).");
        return;
      }
      if (!/^\d{10}$/.test(phone.trim())) {
        fail("Số điện thoại phải gồm đúng 10 chữ số.");
        return;
      }
      if (password.length < 6) {
        fail("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }
    } else {
      if (!username.trim() || !password) {
        fail("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
        return;
      }
    }
    setBusy(true);
    try {
      if (form === "register") {
        await register({
          email: email.trim(),
          username: username.trim(),
          password,
          fullname: fullname.trim(),
          phone: phone.trim(),
        });
      } else {
        await login(username.trim(), password);
      }
      router.replace("/");
    } catch (caught) {
      fail(caught instanceof ApiError ? caught.message : t("welcome.fail"));
    } finally {
      setBusy(false);
    }
  }

  function gmailAddress(value: string) {
    return /^[a-zA-Z0-9._%+-]+@(gmail\.com|googlemail\.com|[a-zA-Z0-9.-]+\.edu\.vn)$/i.test(value.trim());
  }

  async function gmailSubmit() {
    if (busy || !gmailForm) return;
    if (!gmailAddress(email)) {
      fail("Chỉ nhận Gmail, Google Mail hoặc email trường đuôi edu.vn.");
      return;
    }
    if (gmailNew && password && password.length < 6) {
      fail("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (gmailNew && phone.trim() && !/^\d{10}$/.test(phone.trim())) {
      fail("Số điện thoại phải gồm đúng 10 chữ số.");
      return;
    }
    setBusy(true);
    try {
      if (!codeSent) {
        let sent;
        try {
          sent = await backend.sendGmailOtp(email.trim(), gmailNew ? "register" : "login");
        } catch (caught) {
          if (!gmailNew && caught instanceof ApiError && caught.status === 404) {
            setGmailNew(true);
            sent = await backend.sendGmailOtp(email.trim(), "register");
          } else {
            throw caught;
          }
        }
        setCodeSent(true);
        toast.show(sent.message, "success");
        return;
      }
      if (!/^\d{6}$/.test(otp.trim())) {
        fail("Nhập mã 6 số trong email.");
        return;
      }
      const data = await backend.verifyGmailOtp({
        email: email.trim(),
        otp: otp.trim(),
        ...(gmailNew && fullname.trim() ? { fullname: fullname.trim() } : {}),
        ...(gmailNew && phone.trim() ? { phone: phone.trim() } : {}),
        ...(gmailNew && password ? { password } : {}),
        ...(gmailNew && username.trim() ? { username: username.trim() } : {}),
      });
      await open(data);
      router.replace("/");
    } catch (caught) {
      fail(caught instanceof ApiError ? caught.message : t("welcome.fail"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        backgroundColor: colors.surface,
        gap: 16,
      }}
    >
      <Image source={require("../../assets/icon.png")} style={{ width: 96, height: 96, borderRadius: 22, alignSelf: "center" }} />
      <View style={{ gap: 8 }}>
        <Title>{t("welcome.title")}</Title>
        <Body muted>{t("welcome.body")}</Body>
      </View>
      {form === "forgot" ? (
        <View style={{ gap: 10 }}>
          <PasswordReset />
          <Button label={t("welcome.back")} tone="ghost" onPress={() => setForm(null)} />
        </View>
      ) : null}
      {form === "login" || form === "register" ? (
        <View style={{ gap: 10 }}>
          {form === "register" ? <Field label={t("welcome.email")} value={email} onChangeText={setEmail} keyboard="email-address" /> : null}
          {form === "register" ? <Field label={t("welcome.name")} value={fullname} onChangeText={setFullname} /> : null}
          {form === "register" ? <Field label={t("welcome.phone")} value={phone} onChangeText={setPhone} keyboard="phone-pad" /> : null}
          <Field label={form === "login" ? t("welcome.userOrGmail") : t("welcome.user")} value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Field label={t("welcome.password")} value={password} onChangeText={setPassword} secure />
          <Button
            disabled={busy}
            label={busy ? t("welcome.sending") : form === "register" ? t("welcome.create") : t("welcome.enter")}
            onPress={() => void submit()}
          />
          {form === "login" ? <Button label={t("welcome.forgot")} tone="ghost" onPress={() => setForm("forgot")} /> : null}
          <Button label={t("welcome.back")} tone="ghost" onPress={() => setForm(null)} />
        </View>
      ) : null}
      {gmailForm ? (
        <View style={{ gap: 10 }}>
          <Title>{t("welcome.gmail")}</Title>
          <Body muted>{gmailNew ? "Gmail này chưa có tài khoản. Nhập thêm thông tin rồi xác nhận mã." : "Gmail, Google Mail hoặc email trường đuôi edu.vn. Mã có hiệu lực 10 phút."}</Body>
          <Field label={t("welcome.email")} value={email} onChangeText={setEmail} keyboard="email-address" autoCapitalize="none" />
          {gmailNew ? <Field label={t("welcome.name")} value={fullname} onChangeText={setFullname} /> : null}
          {gmailNew ? <Field label={t("welcome.phone")} value={phone} onChangeText={setPhone} keyboard="phone-pad" /> : null}
          {gmailNew ? <Field label={t("welcome.password")} value={password} onChangeText={setPassword} secure /> : null}
          {codeSent ? <Field label={t("welcome.otp")} value={otp} onChangeText={setOtp} keyboard="phone-pad" /> : null}
          <Button
            disabled={busy}
            label={busy ? t("welcome.sending") : codeSent ? t("welcome.confirmCode") : t("welcome.sendCode")}
            onPress={() => void gmailSubmit()}
          />
          <Button label={t("welcome.back")} tone="ghost" onPress={() => { setForm(null); setCodeSent(false); }} />
        </View>
      ) : null}
      {form === null ? (
        <View style={{ gap: 10 }}>
          <Button label={t("welcome.login")} onPress={() => setForm("login")} />
          <Button label={t("welcome.register")} tone="ghost" onPress={() => setForm("register")} />
          <Button label={t("welcome.forgot")} tone="ghost" onPress={() => setForm("forgot")} />
          <Button
            label={t("welcome.guest")}
            tone="ghost"
            onPress={() => {
              enterGuest();
              router.replace("/");
            }}
          />
          {guest ? <Button label={t("nav.back")} tone="ghost" onPress={() => router.back()} /> : null}
        </View>
      ) : null}
    </ScrollView>
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
  const [focused, setFocused] = useState(false);
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          minHeight: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: focused ? colors.primary : colors.hairline,
          backgroundColor: colors.card,
          paddingHorizontal: 12,
          fontFamily: fonts.regular,
          fontSize: 16,
          color: colors.ink,
        }}
      />
    </View>
  );
}
