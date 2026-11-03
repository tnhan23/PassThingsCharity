import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ApiError } from "@/api/client";
import { backend } from "@/api/backend";
import type { NoticeRow } from "@/api/types";
import { useSession } from "@/api/session";
import { Screen } from "@/components/chrome";
import { Field } from "@/components/form";
import { Body, Button, Card, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

const roles = ["ALL", "USER", "VOLUNTEER", "STAFF", "STATION_MANAGER", "ORG_MANAGER", "ADMIN"];
const kinds = ["SYSTEM", "CAMPAIGN", "STATION", "ALERT"];

export function NoticesScreen() {
  const { token, user } = useSession();
  const [rows, setRows] = useState<NoticeRow[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetRole, setTargetRole] = useState("ALL");
  const [kind, setKind] = useState("SYSTEM");
  const [userId, setUserId] = useState("");

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

  async function send() {
    if (!token) return;
    setNote("");
    try {
      const data = await backend.sendNotification(token, {
        title,
        content,
        targetRole,
        type: kind,
        ...(userId.trim() ? { userId: userId.trim() } : {}),
      });
      setNote(data.message);
      setTitle("");
      setContent("");
      load();
    } catch (reason) {
      setNote(reason instanceof ApiError ? reason.message : "Không gửi được thông báo.");
    }
  }

  if (!token) {
    return (
      <Screen tab="profile">
        <Title>Thông báo</Title>
        <Body>Đăng nhập để xem thông báo server gửi cho tài khoản này.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  return (
    <Screen tab="profile">
      <Title>Thông báo</Title>
      <Body muted>{unread > 0 ? `${unread} thông báo chưa đọc.` : "Không còn thông báo chưa đọc."}</Body>
      {note ? <Body>{note}</Body> : null}
      {error ? <Body>{error}</Body> : null}
      {rows === null ? <ActivityIndicator color={colors.primary} /> : null}
      {rows && rows.length === 0 && !error ? <Body>Chưa có thông báo nào gửi tới vai trò này.</Body> : null}
      {rows && rows.length > 0 ? <Button label="Đánh dấu tất cả đã đọc" tone="ghost" onPress={markAll} /> : null}
      {rows?.map((item) => (
        <Card key={item._id}>
          <Title>{item.title}</Title>
          <Body>{item.content}</Body>
          <Body muted>{`${item.type || "SYSTEM"}${item.isRead ? " · Đã đọc" : " · Chưa đọc"}`}</Body>
          {item.isRead ? null : <Button label="Đánh dấu đã đọc" tone="ghost" onPress={() => markOne(item._id)} />}
        </Card>
      ))}
      {user?.role === "ADMIN" ? (
        <Card>
          <Title>Gửi thông báo</Title>
          <Body muted>Để trống người nhận thì gửi theo vai trò. Có mã người nhận thì chỉ người đó thấy.</Body>
          <Field label="Tiêu đề" value={title} onChangeText={setTitle} />
          <Field label="Nội dung" value={content} onChangeText={setContent} />
          <Field label="Mã người nhận, nếu gửi riêng" value={userId} onChangeText={setUserId} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>Vai trò nhận</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {roles.map((role) => (
              <Tap key={role} onPress={() => setTargetRole(role)}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: role === targetRole ? colors.primary : colors.muted }}>{role}</Text>
              </Tap>
            ))}
          </View>
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>Loại</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {kinds.map((item) => (
              <Tap key={item} onPress={() => setKind(item)}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: item === kind ? colors.primary : colors.muted }}>{item}</Text>
              </Tap>
            ))}
          </View>
          <Button label="Gửi" onPress={send} />
        </Card>
      ) : null}
    </Screen>
  );
}
