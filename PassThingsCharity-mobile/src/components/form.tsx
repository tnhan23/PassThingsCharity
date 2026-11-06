import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ApiError } from "@/api/client";
import { backend, resultText } from "@/api/backend";
import { useSession } from "@/api/session";
import { Body, Button, Card, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

export function Field({
  label,
  value,
  onChangeText,
  secure,
  multiline,
  keyboardType,
  autoCapitalize = "none",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad" | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          minHeight: multiline ? 96 : 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: focused ? colors.primary : colors.hairline,
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

export function NumberPicker({
  label,
  value,
  minimum,
  onChange,
}: {
  label: string;
  value: string;
  minimum: number;
  onChange: (value: string) => void;
}) {
  const parsedValue = Number(value);
  const currentValue = Number.isInteger(parsedValue) && parsedValue >= minimum ? parsedValue : minimum;

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Tap
          accessibilityLabel={`Giảm ${label}`}
          disabled={currentValue === minimum}
          onPress={() => onChange(String(Math.max(minimum, currentValue - 1)))}
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.hairline,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ fontFamily: fonts.medium, fontSize: 24, color: colors.primary }}>−</Text>
        </Tap>
        <TextInput
          value={value}
          onChangeText={onChange}
          onBlur={() => {
            if (!Number.isInteger(Number(value)) || Number(value) < minimum) onChange(String(minimum));
          }}
          keyboardType="number-pad"
          accessibilityLabel={label}
          style={{
            flex: 1,
            minHeight: 48,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.hairline,
            backgroundColor: colors.surface,
            paddingHorizontal: 12,
            fontFamily: fonts.medium,
            fontSize: 18,
            color: colors.ink,
            textAlign: "center",
          }}
        />
        <Tap
          accessibilityLabel={`Tăng ${label}`}
          onPress={() => onChange(String(currentValue + 1))}
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.hairline,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ fontFamily: fonts.medium, fontSize: 24, color: colors.primary }}>+</Text>
        </Tap>
      </View>
    </View>
  );
}

export function PasswordReset() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(kind: "code" | "reset") {
    setBusy(true);
    setMessage("");
    try {
      const data = kind === "code"
        ? await backend.forgotPassword(email.trim())
        : await backend.resetPassword({ email: email.trim(), otp: otp.trim(), newPassword: nextPassword });
      setMessage(data.message);
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Máy chủ từ chối yêu cầu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Title>Đặt lại mật khẩu</Title>
      <Body muted>Máy chủ gửi mã 6 số qua email. Mã hết hạn sau 10 phút. Mật khẩu mới từ 6 ký tự.</Body>
      <Field label="Email" value={email} onChangeText={setEmail} />
      <Button disabled={busy} label={busy ? "Đang gửi" : "Gửi mã"} onPress={() => void send("code")} />
      <Field label="Mã 6 số" value={otp} onChangeText={setOtp} />
      <Field label="Mật khẩu mới" value={nextPassword} onChangeText={setNextPassword} secure />
      {message ? <Text selectable style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.ink }}>{message}</Text> : null}
      <Button disabled={busy} label={busy ? "Đang gửi" : "Đặt mật khẩu"} tone="ghost" onPress={() => void send("reset")} />
    </Card>
  );
}

export function Action({
  title,
  note,
  fields = [],
  label,
  run,
}: {
  title: string;
  note: string;
  fields?: { name: string; label: string; secure?: boolean }[];
  label: string;
  run: (values: Record<string, string>, token: string) => Promise<unknown>;
}) {
  const { token } = useSession();
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <Title>{title}</Title>
      <Body muted>{note}</Body>
      {fields.map((field) => (
        <Field
          key={field.name}
          label={field.label}
          value={values[field.name] ?? ""}
          secure={field.secure}
          onChangeText={(next) => setValues((current) => ({ ...current, [field.name]: next }))}
        />
      ))}
      {message ? <Text selectable style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.ink }}>{message}</Text> : null}
      <Button
        disabled={busy}
        label={busy ? "Đang gửi" : label}
        onPress={() => {
          if (busy) return;
          if (!token) {
            setMessage("Đăng nhập trước khi gọi API này.");
            return;
          }
          setBusy(true);
          setMessage("");
          void run(values, token)
            .then((data) => setMessage(resultText(data)))
            .catch((caught) => setMessage(caught instanceof ApiError ? caught.message : "Máy chủ từ chối yêu cầu."))
            .finally(() => setBusy(false));
        }}
      />
    </Card>
  );
}
