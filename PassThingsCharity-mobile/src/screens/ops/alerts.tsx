import { useState } from "react";
import { View } from "react-native";
import { ApiError } from "@/api/client";
import { backend } from "@/api/backend";
import { useSession } from "@/api/session";
import { Field } from "@/components/form";
import { Body, Button, Pill, Title } from "@/components/ui";
import { OpsGate } from "@/screens/ops/kit";

export function AlertCompose() {
  const { token } = useSession();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<"ALL" | "STAFF">("ALL");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!token || busy) return;
    setBusy(true);
    setNote("");
    try {
      const data = await backend.sendNotification(token, {
        title: title.trim(),
        content: content.trim(),
        targetRole: audience,
        type: "ALERT",
      });
      setNote(data.message);
      setTitle("");
      setContent("");
    } catch (reason) {
      setNote(reason instanceof ApiError ? reason.message : "Không gửi được thông báo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OpsGate>
      <Title>Gửi thông báo</Title>
      <Body>Tin này vào chuông của người nhận. Mọi người nhận tin gửi cho toàn bộ. Nhân viên chỉ nhận tin gửi cho nhân viên.</Body>
      {note ? <Body>{note}</Body> : null}
      <Field label="Tiêu đề" value={title} onChangeText={setTitle} />
      <Field label="Nội dung" value={content} onChangeText={setContent} multiline />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pill label="Mọi người" active={audience === "ALL"} onPress={() => setAudience("ALL")} />
        <Pill label="Nhân viên" active={audience === "STAFF"} onPress={() => setAudience("STAFF")} />
      </View>
      <Button label={busy ? "Đang gửi" : "Gửi thông báo"} disabled={busy || !title.trim() || !content.trim()} onPress={() => void send()} />
    </OpsGate>
  );
}
