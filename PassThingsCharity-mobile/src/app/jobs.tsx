import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { useSession } from "@/api/session";
import { Screen } from "@/components/chrome";
import { Badge, Body, Button, Card, StatRow, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

type Post = {
  _id: string;
  title?: string;
  description?: string;
  rewardPoints?: number;
  startTime?: string;
  endTime?: string;
  slots?: { remaining?: number; total?: number };
  stationId?: { name?: string; address?: string } | string;
};

function stationName(value: Post["stationId"]) {
  if (!value || typeof value === "string") return "Trạm";
  return value.name || "Trạm";
}

function when(value?: string) {
  if (!value) return "Chưa chốt giờ";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export default function JobsPage() {
  const { token } = useSession();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    backend.listOpenTasks(token)
      .then((data) => {
        if (!cancelled) setPosts(data.data);
      })
      .catch((caught) => {
        if (!cancelled) {
          setPosts([]);
          setNote(caught instanceof ApiError ? caught.message : "Không tải được tin tuyển.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <Screen tab="profile">
        <Title>Việc tại trạm</Title>
        <Body>Đăng nhập để xem tin tuyển và bấm ứng tuyển.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  const totalOpenSlots = (posts ?? []).reduce((sum, post) => sum + (post.slots?.remaining ?? 0), 0);

  return (
    <Screen tab="profile">
      <Title>Việc tại trạm</Title>
      <Body muted>Mỗi tin là một việc thời vụ hoặc tình nguyện. Làm xong được cộng điểm.</Body>
      {posts ? (
        <StatRow
          items={[
            { label: "Tin đang mở", value: posts.length, unit: "việc", tone: "primary" },
            { label: "Tổng chỗ trống", value: totalOpenSlots, unit: "chỗ", tone: "coral" },
          ]}
        />
      ) : null}
      {note ? <Body>{note}</Body> : null}
      {posts && posts.length === 0 ? <Body muted>Hiện chưa có tin nào đang mở.</Body> : null}
      {posts?.map((post) => {
        const remaining = post.slots?.remaining;
        const total = post.slots?.total;
        return (
          <Card key={post._id}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <Badge label={stationName(post.stationId)} tone="primary" />
              <Badge label={`+${post.rewardPoints || 0} điểm`} tone="coral" />
            </View>
            <Title>{post.title || "Việc chưa đặt tên"}</Title>
            {post.description ? <Body muted>{post.description}</Body> : null}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted, fontVariant: ["tabular-nums"] }}>
                {`${when(post.startTime)} – ${when(post.endTime)}`}
              </Text>
              <Badge
                label={remaining === undefined ? "Chưa rõ số chỗ" : `Còn ${remaining}${total ? `/${total}` : ""} chỗ`}
                tone={remaining === 0 ? "danger" : "neutral"}
              />
            </View>
            <Button
              label="Ứng tuyển"
              onPress={() => {
                setNote("");
                void backend.applyTask(token, post._id)
                  .then((data) => setNote(data.message))
                  .catch((caught: unknown) => setNote(caught instanceof ApiError ? caught.message : "Không gửi được đơn."));
              }}
            />
          </Card>
        );
      })}
    </Screen>
  );
}
