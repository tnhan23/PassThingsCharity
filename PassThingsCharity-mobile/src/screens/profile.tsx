import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { api, ApiError } from "@/api/client";
import { useSession } from "@/api/session";
import type { PointsPayload } from "@/api/types";
import { Screen } from "@/components/chrome";
import { Body, Button, Card, Eyebrow, Photo, Title } from "@/components/ui";
import { colors, fonts, photos } from "@/theme";

export function ProfileScreen({ state }: { state: "full" | "low" | "empty" | "loading" | "error" }) {
  if (state === "loading") {
    return (
      <Screen tab="profile">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang tải hồ sơ</Title>
          <Body muted>Chưa hiện 0 điểm khi hồ sơ chưa về.</Body>
        </Card>
        <Button label="Xem hồ sơ đã tải" onPress={() => router.replace("/profile/full")} />
      </Screen>
    );
  }
  if (state === "error") {
    return (
      <Screen tab="profile">
        <Title>Không tải được hồ sơ</Title>
        <Body>Điểm và lịch sử chưa hiện. Biên lai đã ký vẫn còn tại trạm.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/profile/full")} />
      </Screen>
    );
  }
  if (state === "empty") {
    return (
      <Screen tab="profile">
        <Title>Chào bạn</Title>
        <Body>Chưa có lần mang đồ nào được trạm xác nhận. Điểm chỉ xuất hiện sau khi có dòng đã nhận.</Body>
        <Button label="Xem nhu cầu chiến dịch" onPress={() => router.push("/campaign")} />
        <Button label="Đăng nhập" tone="ghost" onPress={() => router.push("/otp/enter")} />
      </Screen>
    );
  }
  if (state === "low") {
    return (
      <Screen tab="profile">
        <Eyebrow>Cảnh báo chất lượng</Eyebrow>
        <Title>Trần Hoàng Nam</Title>
        <Text style={{ fontFamily: fonts.bold, fontSize: 32, color: colors.error }}>62 / 100</Text>
        <Body>Ba kiện gần đây có tỷ lệ loại cao. Điểm đóng góp của phần đạt vẫn được giữ. Phần loại không bị đổi thành điểm âm.</Body>
        <Card>
          <Body>Lần tới, giặt sạch, phơi khô, và tách đồ không đúng mùa trước khi mang tới.</Body>
        </Card>
        <Button label="Đọc tiêu chuẩn nhận" onPress={() => router.push("/campaign")} />
        <Button label="Hồ sơ đủ điểm" tone="ghost" onPress={() => router.push("/profile/full")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <AccountCard />
      <Eyebrow>Số minh họa, máy chủ chưa có sổ tiếp nhận</Eyebrow>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Photo uri={photos.portrait} height={72} width={72} radius={36} />
        <View style={{ flex: 1, gap: 4 }}>
          <Title>Trần Hoàng Nam</Title>
          <Body muted>Thành viên từ tháng 3, 2024 · Bình Thạnh</Body>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Stat n="18" label="Lượt trao" />
        <Stat n="52,5 kg" label="Đã được nhận" />
        <Stat n="98,4" label="Tín nhiệm" />
      </View>
      <Card>
        <Eyebrow>#DN-2025-0894 · 20/03/2025</Eyebrow>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Áo ấm Hà Giang</Text>
        <Body muted>Kiểm định đạt 8,5 / 10 kg. +85 điểm. Đang giữ tại Trạm Đa Kao.</Body>
        <Button label="Biên lai" tone="ghost" onPress={() => router.push("/receipt/done")} />
      </Card>
      <Card>
        <Eyebrow>Ca tình nguyện</Eyebrow>
        <Body>24 giờ đã chốt · 180 điểm tình nguyện</Body>
        <Button label="Bảng ca" onPress={() => router.push("/volunteer/tasks")} />
      </Card>
      <Button label="Lịch sử đóng góp" onPress={() => router.push("/history/content")} />
      <Button label="Cài đặt" tone="ghost" onPress={() => router.push("/settings")} />
      <Button label="Hồ sơ mới" tone="ghost" onPress={() => router.push("/profile/empty")} />
      <Button label="Cảnh báo điểm thấp" tone="ghost" onPress={() => router.push("/profile/low")} />
    </Screen>
  );
}

function AccountCard() {
  const { user, token, logout } = useSession();
  const [points, setPoints] = useState<number | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!token) {
      setPoints(null);
      return;
    }
    let cancelled = false;
    api<PointsPayload>("/gamification/points/me", { token })
      .then((data) => {
        if (!cancelled) setPoints(data.totalPoints);
      })
      .catch((caught) => {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Không tải được điểm.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!user) {
    return <Button label="Đăng nhập để xem điểm" onPress={() => router.push("/login")} />;
  }

  return (
    <Card>
      <Eyebrow>Tài khoản máy chủ</Eyebrow>
      <Title>{user.username}</Title>
      <Body muted>{user.phone}</Body>
      <Text style={{ fontFamily: fonts.bold, fontSize: 28, color: colors.primary }}>
        {points === null ? "…" : `${points} điểm`}
      </Text>
      {problem ? <Body>{problem}</Body> : null}
      <Button
        label="Đăng xuất"
        tone="ghost"
        onPress={() => {
          void logout();
        }}
      />
    </Card>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.primary }}>{n}</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{label}</Text>
    </Card>
  );
}
