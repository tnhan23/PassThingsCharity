import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { useGuest } from "@/api/guest";
import { useLocale } from "@/api/locale";
import { useSession } from "@/api/session";
import { PasswordReset } from "@/components/form";
import { Body, Button, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

export default function LoginPage() {
  const { ready, user, login, register } = useSession();
  const { guest, enterGuest } = useGuest();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<"login" | "register" | "forgot" | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (ready && user) return <Redirect href="/" />;

  async function submit() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (form === "register") {
        await register({ email, username, password, fullname, phone });
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
          <Field label={t("welcome.user")} value={username} onChangeText={setUsername} autoCapitalize="none" />
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
