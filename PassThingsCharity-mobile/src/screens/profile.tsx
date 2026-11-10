import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { useGuest } from "@/api/guest";
import { useLocale } from "@/api/locale";
import { isOperator, useSession } from "@/api/session";
import { useShell } from "@/api/shell";
import { Screen } from "@/components/chrome";
import { Badge, Body, Button, Card, Eyebrow, Icon, Photo, StatRow, Title } from "@/components/ui";
import { MyDonations } from "@/screens/receive";
import { colors, fonts } from "@/theme";

export function ProfileScreen({ state }: { state: "full" | "low" | "empty" | "loading" | "error" }) {
  const { user } = useSession();
  const { t } = useLocale();
  const { desk } = useShell();
  if (!user && state === "full") {
    return (
      <Screen tab="profile">
        <Title>{t("guest.title")}</Title>
        <Body>{t("guest.body")}</Body>
        <Button label={t("welcome.login")} onPress={() => router.push("/login")} />
      </Screen>
    );
  }
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
      {desk ? null : <MyDonations summary />}
      {user?.role === "USER" || user?.role === "VOLUNTEER" ? <Button label="Việc tình nguyện" onPress={() => router.push("/volunteer/tasks")} /> : null}
    </Screen>
  );
}

function AccountCard() {
  const { user, token, logout } = useSession();
  const { leaveGuest } = useGuest();
  const { t } = useLocale();
  const { desk, canSwitch, setMode } = useShell();
  const [points, setPoints] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<{ _id: string; points: number; type: string; description?: string }[]>([]);
  const [badgeTitles, setBadgeTitles] = useState<string[]>([]);
  const [paperTitles, setPaperTitles] = useState<string[]>([]);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!token) {
      setPoints(null);
      setTransactions([]);
      setBadgeTitles([]);
      setPaperTitles([]);
      return;
    }
    let cancelled = false;
    Promise.all([backend.myPoints(token), backend.myAchievements(token), backend.myCertificates(token)])
      .then(([pointData, badges, papers]) => {
        if (cancelled) return;
        setPoints(pointData.totalPoints);
        setTransactions(pointData.transactions.slice(0, 5));
        setBadgeTitles(
          badges.unlockedAchievements
            .map((row) => (typeof row.achievementId === "object" ? row.achievementId?.title : ""))
            .filter((title): title is string => Boolean(title)),
        );
        setPaperTitles(papers.certificates.map((row) => row.title ?? "Chứng nhận"));
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        {user.avatarUrl ? (
          <Photo uri={user.avatarUrl} height={72} width={72} radius={36} />
        ) : (
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="person" size={32} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Eyebrow>Tài khoản máy chủ</Eyebrow>
            {user.role ? <Badge label={user.role} tone="primary" /> : null}
          </View>
          <Title>{user.username}</Title>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.muted, fontVariant: ["tabular-nums"] }}>
            {user.phone}
          </Text>
        </View>
      </View>
      {desk ? null : (
        <StatRow
          items={[
            { label: "Điểm tích lũy", value: points === null ? "…" : points, unit: "điểm", tone: "primary" },
            { label: "Thành tích", value: badgeTitles.length, unit: "mốc", tone: "coral" },
            { label: "Chứng nhận", value: paperTitles.length, unit: "giấy", tone: "ink" },
          ]}
        />
      )}
      {desk ? null : problem ? <Body>{problem}</Body> : null}
      {!desk && (badgeTitles.length > 0 || paperTitles.length > 0) ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {badgeTitles.map((title, index) => (
            <Badge key={`badge-${title}-${index}`} label={`★ ${title}`} tone="coral" />
          ))}
          {paperTitles.map((title, index) => (
            <Badge key={`paper-${title}-${index}`} label={`✓ ${title}`} tone="primary" />
          ))}
        </View>
      ) : null}
      {!desk && transactions.length > 0 ? (
        <View style={{ gap: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.hairline }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>Biến động điểm gần đây</Text>
          {transactions.map((row) => (
            <View
              key={row._id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 4,
              }}
            >
              <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>
                {row.description || row.type}
              </Text>
              <Badge
                label={`${row.points >= 0 ? "+" : ""}${row.points} điểm`}
                tone={row.points >= 0 ? "primary" : "danger"}
              />
            </View>
          ))}
        </View>
      ) : null}
      {user.role === "USER" ? <Button label="Đăng ký tổ chức" onPress={() => router.push("/organization")} /> : null}
      {canSwitch && desk ? <Button label="Đóng góp như người dùng" onPress={() => setMode("member")} /> : null}
      {canSwitch && !desk ? <Button label="Chế độ quản lý" onPress={() => setMode("desk")} /> : null}
      <Button label={t("account.edit")} tone="ghost" onPress={() => router.push("/account")} />
      {isOperator(user.role) && !canSwitch && !desk ? <Button label="Về việc" tone="ghost" onPress={() => router.push("/")} /> : null}
      <Button
        label={t("account.logout")}
        tone="ghost"
        onPress={() => {
          leaveGuest();
          void logout().then(() => router.replace("/login"));
        }}
      />
    </Card>
  );
}
