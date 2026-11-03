import { router, usePathname, type Href } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isOperator, useSession } from "@/api/session";
import { Button, Icon, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

export type TabKey = "home" | "give" | "stations" | "profile";

const roots = new Set(["/", "/campaign", "/stations/list", "/profile/full"]);

export function Screen({
  children,
  tab,
  scroll = true,
}: {
  children: ReactNode;
  tab: TabKey;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState(false);
  return (
    <View style={styles.frame}>
      <View style={styles.root}>
      <Header />
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 136,
            gap: 14,
          }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingBottom: insets.bottom + 88, overflow: "hidden" }}>{children}</View>
      )}
      <TabBar active={tab} sheet={sheet} onCreate={() => setSheet((open) => !open)} />
      <CreateSheet open={sheet} onClose={() => setSheet(false)} />
      </View>
    </View>
  );
}

function Header() {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const { user } = useSession();
  const showBack = !roots.has(path);
  const accountHref = user ? "/profile/full" : "/login";
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        {showBack ? (
          <Tap onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Quay lại">
            <Icon name="arrow-back" size={22} color={colors.primary} />
          </Tap>
        ) : (
          <View style={styles.brand}>
            <Text style={styles.logo}>Pass Things</Text>
            <Text style={styles.logoSub}>Charity</Text>
          </View>
        )}
        <Tap onPress={() => router.push("/stations/list")} style={styles.location}>
          <Icon name="location-on" size={16} color={colors.secondary} />
          <Text style={styles.locationText} numberOfLines={1}>
            TP.HCM
          </Text>
          <Icon name="keyboard-arrow-down" size={16} color={colors.muted} />
        </Tap>
        <View style={{ flex: 1 }} />
        <Tap onPress={() => router.push(accountHref)} style={styles.trust} accessibilityLabel={user ? user.username : "Đăng nhập"}>
          <Icon name="verified" size={14} color={colors.primary} />
          <Text style={styles.trustText} numberOfLines={1}>{user ? user.username : "Vào"}</Text>
        </Tap>
        <Tap onPress={() => router.push("/notifications")} style={styles.iconBtn} accessibilityLabel="Thông báo">
          <Icon name="notifications-none" size={22} color={colors.primary} />
        </Tap>
        <Tap onPress={() => router.push(accountHref)} style={styles.iconBtn} accessibilityLabel="Hồ sơ">
          <Icon name="person-outline" size={22} color={colors.primary} />
        </Tap>
      </View>
    </View>
  );
}

function TabBar({ active, sheet, onCreate }: { active: TabKey; sheet: boolean; onCreate: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <TabItem label="Khám phá" icon="explore" active={active === "home"} href="/" />
      <TabItem label="Tặng đồ" icon="volunteer-activism" active={active === "give"} href="/campaign" />
      <View style={{ width: 64 }} />
      <TabItem label="Trạm gom" icon="warehouse" active={active === "stations"} href="/stations/list" />
      <TabItem label="Hồ sơ" icon="account-circle" active={active === "profile"} href={user ? "/profile/full" : "/login"} />
      <Tap
        onPress={onCreate}
        style={styles.plus}
        accessibilityLabel={sheet ? "Đóng" : "Tạo mới"}
      >
        <Icon name="add" size={28} color={colors.onPrimary} />
      </Tap>
    </View>
  );
}

function TabItem({
  label,
  icon,
  active,
  href,
}: {
  label: string;
  icon: "explore" | "volunteer-activism" | "warehouse" | "account-circle";
  active: boolean;
  href: "/" | "/campaign" | "/stations/list" | "/profile/full" | "/login";
}) {
  const path = usePathname();
  return (
    <Tap
      onPress={() => {
        if (path === href) return;
        router.navigate(href);
      }}
      style={styles.tab}
      accessibilityLabel={label}
    >
      <Icon name={icon} size={22} color={active ? colors.primary : colors.outline} />
      <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.outline }]}>{label}</Text>
    </Tap>
  );
}

const actions: { label: string; href: Href; tone?: "ghost"; roles?: string[] }[] = [
  { label: "Mang đồ tới trạm", href: "/stations/map" },
  { label: "Đăng ký tình nguyện", href: "/volunteer/form", tone: "ghost" },
  { label: "Ca trực", href: "/shifts", tone: "ghost", roles: ["STATION_MANAGER", "ORG_MANAGER", "STAFF"] },
  { label: "Vận hành", href: "/desk", tone: "ghost" },
  { label: "Xin nhận hỗ trợ", href: "/receive/form", tone: "ghost" },
  { label: "Quét mã QR", href: "/qr/scan", tone: "ghost" },
];

function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useSession();
  const visible = actions.filter((action) => {
    if (action.href === "/desk") return isOperator(user?.role);
    if (action.roles) return Boolean(user?.role && action.roles.includes(user.role));
    return true;
  });
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
    progress.value = withTiming(open ? 1 : 0, { duration: open ? 280 : 220, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished && !open) runOnJS(setMounted)(false);
    });
  }, [open, progress]);
  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * 520 }] }));
  if (!mounted) return null;
  return (
    <View style={styles.sheetRoot}>
      <Animated.View style={[styles.backdrop, backdrop]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Đóng" />
      </Animated.View>
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }, panel]}>
        <Title>Bạn muốn làm gì?</Title>
        {visible.map((action) => (
          <Button
            key={action.href.toString()}
            label={action.label}
            tone={action.tone}
            onPress={() => {
              onClose();
              router.push(action.href);
            }}
          />
        ))}
        <Button label="Đóng" tone="ghost" onPress={onClose} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: colors.surface, alignItems: "center" },
  root: { flex: 1, width: "100%", maxWidth: 430, position: "relative", backgroundColor: colors.surface },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  headerRow: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 4,
  },
  brand: { justifyContent: "center" },
  logo: { fontFamily: fonts.italic, fontSize: 15, lineHeight: 17, color: colors.primary },
  logoSub: { fontFamily: fonts.italic, fontSize: 12, lineHeight: 14, color: colors.primary },
  location: { flexDirection: "row", alignItems: "center", gap: 2, maxWidth: 108, marginLeft: 4 },
  locationText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, flexShrink: 1 },
  trust: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trustText: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary, maxWidth: 88 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: 8,
  },
  tab: { alignItems: "center", gap: 2, minWidth: 64, paddingBottom: 4 },
  tabLabel: { fontFamily: fonts.medium, fontSize: 11 },
  plus: {
    position: "absolute",
    top: -22,
    left: "50%",
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 16px rgba(7, 36, 26, 0.28)",
  },
  sheetRoot: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(7, 36, 26, 0.45)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 10,
  },
});
