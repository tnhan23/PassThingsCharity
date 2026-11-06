import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { ApiError } from "@/api/client";
import { backend } from "@/api/backend";
import type { NoticeRow } from "@/api/types";
import { useLocale, type CopyKey } from "@/api/locale";
import { useSession } from "@/api/session";
import { Screen } from "@/components/chrome";
import { Body, Button, Card, Title } from "@/components/ui";
import { colors } from "@/theme";

function noticeKind(type: string | undefined, t: (key: CopyKey) => string) {
  if (type === "ALERT") return t("notice.alert");
  if (type === "CAMPAIGN") return t("notice.campaign");
  if (type === "STATION") return t("notice.station");
  return t("notice.system");
}

export function NoticesScreen() {
  const { token, user } = useSession();
  const { t } = useLocale();
  const [rows, setRows] = useState<NoticeRow[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(() => {
    if (!token) {
      setRows([]);
      return;
    }
    setError("");
    backend.myNotifications(token)
      .then((data) => {
        setRows(data.data);
        setUnread(data.unreadCount);
      })
      .catch((reason: unknown) => {
        setRows([]);
        setError(reason instanceof ApiError ? reason.message : "Không tải được thông báo.");
      });
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function markOne(id: string) {
    if (!token) return;
    setNote("");
    try {
      const data = await backend.markNotificationRead(token, id);
      setNote(data.message);
      load();
    } catch (reason) {
      setNote(reason instanceof ApiError ? reason.message : "Không đánh dấu được.");
    }
  }

  async function markAll() {
    if (!token) return;
    setNote("");
    try {
      const data = await backend.markAllNotificationsRead(token);
      setNote(data.message);
      load();
    } catch (reason) {
      setNote(reason instanceof ApiError ? reason.message : "Không đánh dấu được.");
    }
  }

  if (!token) {
    return (
      <Screen tab="home">
        <Title>{t("notice.title")}</Title>
        <Body>{t("notice.login")}</Body>
        <Button label={t("welcome.login")} onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  return (
    <Screen tab="home">
      <Title>{t("notice.title")}</Title>
      <Body muted>{unread > 0 ? `${unread} ${t("notice.unread")}` : t("notice.noneUnread")}</Body>
      {note ? <Body>{note}</Body> : null}
      {error ? <Body>{error}</Body> : null}
      {rows === null ? <ActivityIndicator color={colors.primary} /> : null}
      {rows && rows.length === 0 && !error ? <Body>{t("notice.empty")}</Body> : null}
      {rows && rows.length > 0 ? <Button label={t("notice.markAll")} tone="ghost" onPress={markAll} /> : null}
      {rows?.map((item) => (
        <Card key={item._id}>
          <Title>{item.title}</Title>
          <Body>{item.content}</Body>
          <Body muted>{`${noticeKind(item.type, t)}. ${item.isRead ? t("notice.read") : t("notice.fresh")}`}</Body>
          {item.isRead ? null : <Button label={t("notice.mark")} tone="ghost" onPress={() => markOne(item._id)} />}
        </Card>
      ))}
      {user?.role === "ADMIN" ? <Button label={t("notice.compose")} tone="ghost" onPress={() => router.push("/desk/alerts")} /> : null}
    </Screen>
  );
}
