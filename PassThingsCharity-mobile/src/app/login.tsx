import { Redirect, router } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Image, Platform, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { useGuest } from "@/api/guest";
import { useLocale } from "@/api/locale";
import { useSession } from "@/api/session";
import { PasswordReset } from "@/components/form";
import { Body, Button, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = "116703453640-5pmgf0934l9ri041611mcr8qkm0oq246.apps.googleusercontent.com";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

const googleClientIds = {
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  webClientId: GOOGLE_WEB_CLIENT_ID,
};

const hasPlatformGoogleClientId =
  Platform.OS === "android"
    ? Boolean(GOOGLE_ANDROID_CLIENT_ID)
    : Platform.OS === "web"
      ? Boolean(GOOGLE_WEB_CLIENT_ID)
      : Boolean(GOOGLE_IOS_CLIENT_ID);

export default function LoginPage() {
  const { ready, user, login, register, open } = useSession();
  const { guest, enterGuest } = useGuest();
  const { t } = useLocale();
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
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const gmailForm = form === "gmail";

  if (ready && user) return <Redirect href="/" />;

  async function submit() {
    if (busy) return;
    if (form === "register") {
      if (!email.trim() || !fullname.trim() || !phone.trim() || !username.trim() || !password) {
        setError("Vui lòng điền đủ email, họ tên, số điện thoại, tên đăng nhập và mật khẩu.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Email không đúng định dạng.");
        return;
      }
      if (!/^\d{10}$/.test(phone.trim())) {
        setError("Số điện thoại phải gồm đúng 10 chữ số.");
        return;
      }
      if (password.length < 6) {
        setError("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }
    } else if (!username.trim() || !password) {
      setError("Vui lòng nhập đủ tên đăng nhập và mật khẩu.");
      return;
    }
    setError("");
    if (form === "register") {
      if (!email.trim() || !fullname.trim() || !phone.trim() || !username.trim() || !password) {
        setError("Vui lòng điền đầy đủ email, họ tên, số điện thoại, tên đăng nhập và mật khẩu.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Email không đúng định dạng (ví dụ: ten@email.com).");
        return;
      }
      if (!/^\d{10}$/.test(phone.trim())) {
        setError("Số điện thoại phải gồm đúng 10 chữ số.");
        return;
      }
      if (password.length < 6) {
        setError("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }
    } else {
      if (!username.trim() || !password) {
        setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
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
      setError(caught instanceof ApiError ? caught.message : t("welcome.fail"));
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
      setError("Chỉ nhận Gmail, Google Mail hoặc email trường đuôi edu.vn.");
      return;
    }
    if (gmailNew && password && password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (gmailNew && phone.trim() && !/^\d{10}$/.test(phone.trim())) {
      setError("Số điện thoại phải gồm đúng 10 chữ số.");
      return;
    }
    setError("");
    setNote("");
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
        setNote(sent.message);
        return;
      }
      if (!/^\d{6}$/.test(otp.trim())) {
        setError("Nhập mã 6 số trong email.");
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
      setError(caught instanceof ApiError ? caught.message : t("welcome.fail"));
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
          {error ? <Text style={{ fontFamily: fonts.medium, color: colors.error, fontSize: 14 }}>{error}</Text> : null}
          <Button
            disabled={busy}
            label={busy ? t("welcome.sending") : form === "register" ? t("welcome.create") : t("welcome.enter")}
            onPress={() => void submit()}
          />
          {form === "login" ? <Button label={t("welcome.forgot")} tone="ghost" onPress={() => setForm("forgot")} /> : null}
          <Button label={t("welcome.back")} tone="ghost" onPress={() => { setForm(null); setError(""); }} />
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
          {note ? <Body muted>{note}</Body> : null}
          {error ? <Text style={{ fontFamily: fonts.medium, color: colors.error, fontSize: 14 }}>{error}</Text> : null}
          <Button
            disabled={busy}
            label={busy ? t("welcome.sending") : codeSent ? t("welcome.confirmCode") : t("welcome.sendCode")}
            onPress={() => void gmailSubmit()}
          />
          <Button label={t("welcome.back")} tone="ghost" onPress={() => { setForm(null); setError(""); setCodeSent(false); }} />
        </View>
      ) : null}
      {form === null ? (
        <View style={{ gap: 10 }}>
          <Button label={t("welcome.login")} onPress={() => setForm("login")} />
          <Button label={t("welcome.register")} tone="ghost" onPress={() => setForm("register")} />
          {hasPlatformGoogleClientId ? (
            <GoogleSignInButton
              busy={busy}
              setBusy={setBusy}
              setError={setError}
              open={open}
              label={t("welcome.gmail")}
            />
          ) : (
            <View style={{ gap: 8 }}>
              <Tap
                disabled
                style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16, opacity: 0.6 }}
              >
                <GoogleMark />
                <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.primary }}>{t("welcome.gmail")}</Text>
              </Tap>
              <Body muted>
                {`Đăng nhập Google cần cấu hình ${Platform.OS === "android" ? "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID" : "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"}.`}
              </Body>
            </View>
          )}
          {error ? <Text style={{ fontFamily: fonts.medium, color: colors.error, fontSize: 14 }}>{error}</Text> : null}
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

function GoogleSignInButton({
  busy,
  setBusy,
  setError,
  open,
  label,
}: {
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setError: (error: string) => void;
  open: (data: Parameters<ReturnType<typeof useSession>["open"]>[0]) => Promise<void>;
  label: string;
}) {
  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest(googleClientIds);

  useEffect(() => {
    if (googleResponse?.type !== "success") return;
    const idToken = googleResponse.authentication?.idToken || googleResponse.params.id_token;
    if (!idToken) {
      setError("Google không trả mã đăng nhập.");
      return;
    }
    let cancelled = false;
    setBusy(true);
    setError("");
    backend.googleSignIn(idToken)
      .then(async (data) => {
        if (cancelled) return;
        await open(data);
        router.replace("/");
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof ApiError ? caught.message : "Không đăng nhập bằng Google được.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [googleResponse, open, setBusy, setError]);

  return (
    <Tap
      disabled={!googleRequest || busy}
      onPress={() => void promptGoogle()}
      style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16 }}
    >
      <GoogleMark />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.primary }}>{label}</Text>
    </Tap>
  );
}

function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.7 7.2l6.3 5.3C37.4 38.3 44 33 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </Svg>
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
