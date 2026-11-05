import { router, usePathname, type Href } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/api/session";
import { useShell } from "@/api/shell";
import { Body, Button, Icon, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

export type TabKey = "home" | "give" | "stations" | "profile";

const roots = new Set(["/", "/campaign", "/stations/list", "/profile/full", "/desk", "/desk/intake", "/desk/campaigns", "/desk/stations", "/desk/users", "/desk/alerts", "/shifts"]);

function resolvedTab(path: string, role: string | undefined, desk: boolean, fallback: TabKey): TabKey {
  const work = desk && (role === "ADMIN" || role === "STATION_MANAGER" || role === "ORG_MANAGER" || role === "STAFF");
  if (path.startsWith("/profile") || path.startsWith("/login") || path.startsWith("/account") || path.startsWith("/organization") || path.startsWith("/settings")) return "profile";
  if (!work) {
    if (path.startsWith("/campaign") || path.startsWith("/contribution")) return "give";
    if (path.startsWith("/stations") || path.startsWith("/station")) return "stations";
    return path === "/" ? "home" : fallback;
  }
  if (path.startsWith("/desk/intake") || path.startsWith("/receive") || path.startsWith("/desk/users")) return "give";
  if (role === "ORG_MANAGER" && path.startsWith("/desk/campaigns")) return "give";
  if (path.startsWith("/desk/stations") || path.startsWith("/stations") || path.startsWith("/station")) return "stations";
  return "home";
}

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
  const path = usePathname();
  const { user } = useSession();
  const { desk } = useShell();
  const active = resolvedTab(path, user?.role, desk, tab);
  const [sheet, setSheet] = useState(false);
  function onCreate() {
    setSheet((open) => !open);
  }
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
            paddingBottom: insets.bottom + (desk ? 88 : 136),
            gap: 14,
          }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingBottom: insets.bottom + 88, overflow: "hidden" }}>{children}</View>
      )}
      <TabBar active={active} desk={desk} sheet={sheet} onCreate={onCreate} />
      {desk ? null : <CreateSheet open={sheet} onClose={() => setSheet(false)} />}
      </View>
    </View>
  );
}

const deskTitle: Record<string, string> = {
  ADMIN: "Quản trị",
  ORG_MANAGER: "Quản lý tổ chức",
  STATION_MANAGER: "Trưởng trạm",
  STAFF: "Nhân viên quầy",
};

function Header() {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const { user } = useSession();
  const { desk, canSwitch, setMode } = useShell();
  const showBack = !roots.has(path);
  const accountHref = user ? "/profile/full" : "/login";
  const placeHref = "/stations/list";
  if (desk) {
    const ink = colors.onPrimary;
    return (
      <View style={[styles.deskHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          {showBack ? (
            <Tap onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Quay lại">
              <Icon name="arrow-back" size={22} color={ink} />
            </Tap>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={styles.deskKicker}>{deskTitle[user?.role || ""] || "Vận hành"}</Text>
              <Text style={styles.deskName} numberOfLines={1}>{user?.fullName || user?.username || "Pass Things"}</Text>
            </View>
          )}
          {showBack ? <View style={{ flex: 1 }} /> : null}
          {canSwitch ? (
            <Tap onPress={() => setMode("member")} style={styles.deskSwitch} accessibilityLabel="Đóng góp như người dùng">
              <Icon name="volunteer-activism" size={16} color={colors.primary} />
              <Text style={styles.deskSwitchText}>Đóng góp</Text>
            </Tap>
          ) : null}
          <Tap onPress={() => router.push("/notifications")} style={styles.iconBtn} accessibilityLabel="Thông báo">
            <Icon name="notifications-none" size={22} color={ink} />
          </Tap>
        </View>
      </View>
    );
  }
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
        <Tap onPress={() => router.push(placeHref)} style={styles.location}>
          <Icon name="location-on" size={16} color={colors.secondary} />
          <Text style={styles.locationText} numberOfLines={1}>
            TP.HCM
          </Text>
          <Icon name="keyboard-arrow-down" size={16} color={colors.muted} />
        </Tap>
        <View style={{ flex: 1 }} />
        {canSwitch ? (
          <Tap onPress={() => setMode("desk")} style={styles.trust} accessibilityLabel="Chế độ quản lý">
            <Icon name="dashboard" size={14} color={colors.primary} />
            <Text style={styles.trustText}>Quản lý</Text>
          </Tap>
        ) : null}
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

function tabsFor(role: string | undefined, signedIn: boolean, desk: boolean): { key: TabKey; label: string; icon: "explore" | "dashboard" | "volunteer-activism" | "campaign" | "warehouse" | "account-circle" | "receipt-long" | "group"; href: Href }[] {
  const profile: Href = signedIn ? "/profile/full" : "/login";
  if (!desk) {
    return [
      { key: "home", label: "Khám phá", icon: "explore", href: "/" },
      { key: "give", label: "Tặng đồ", icon: "volunteer-activism", href: "/campaign" },
      { key: "stations", label: "Trạm gom", icon: "warehouse", href: "/stations/list" },
      { key: "profile", label: "Hồ sơ", icon: "account-circle", href: profile },
    ];
  }
  if (role === "ADMIN") {
    return [
      { key: "home", label: "Tổng quan", icon: "dashboard", href: "/" },
      { key: "give", label: "Người dùng", icon: "group", href: "/desk/users" },
      { key: "stations", label: "Trạm", icon: "warehouse", href: "/desk/stations" },
      { key: "profile", label: "Tài khoản", icon: "account-circle", href: profile },
    ];
  }
  if (role === "STATION_MANAGER") {
    return [
      { key: "home", label: "Tổng quan", icon: "dashboard", href: "/" },
      { key: "give", label: "Phiếu", icon: "receipt-long", href: "/desk/intake" },
      { key: "stations", label: "Trạm", icon: "warehouse", href: "/desk/stations" },
      { key: "profile", label: "Tài khoản", icon: "account-circle", href: profile },
    ];
  }
  if (role === "ORG_MANAGER") {
    return [
      { key: "home", label: "Tổng quan", icon: "dashboard", href: "/" },
      { key: "give", label: "Chiến dịch", icon: "campaign", href: "/desk/campaigns" },
      { key: "stations", label: "Trạm", icon: "warehouse", href: "/desk/stations" },
      { key: "profile", label: "Tài khoản", icon: "account-circle", href: profile },
    ];
  }
  if (role === "STAFF") {
    return [
      { key: "home", label: "Quầy", icon: "dashboard", href: "/" },
      { key: "give", label: "Phiếu", icon: "receipt-long", href: "/desk/intake" },
      { key: "stations", label: "Trạm", icon: "warehouse", href: "/stations/list" },
      { key: "profile", label: "Tài khoản", icon: "account-circle", href: profile },
    ];
  }
  return [
    { key: "home", label: "Tổng quan", icon: "dashboard", href: "/" },
    { key: "give", label: "Phiếu", icon: "receipt-long", href: "/desk/intake" },
    { key: "stations", label: "Trạm", icon: "warehouse", href: "/desk/stations" },
    { key: "profile", label: "Tài khoản", icon: "account-circle", href: profile },
  ];
}

function TabBar({ active, desk, sheet, onCreate }: { active: TabKey; desk: boolean; sheet: boolean; onCreate: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const tabs = tabsFor(user?.role, Boolean(user), desk);
  if (desk) {
    return (
      <View style={[styles.deskBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {tabs.map((item) => (
          <TabItem key={item.key} label={item.label} icon={item.icon} active={active === item.key} href={item.href} desk />
        ))}
      </View>
    );
  }
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <TabItem label={tabs[0].label} icon={tabs[0].icon} active={active === "home"} href={tabs[0].href} />
      <TabItem label={tabs[1].label} icon={tabs[1].icon} active={active === "give"} href={tabs[1].href} />
      <View style={{ width: 64 }} />
      <TabItem label={tabs[2].label} icon={tabs[2].icon} active={active === "stations"} href={tabs[2].href} />
      <TabItem label={tabs[3].label} icon={tabs[3].icon} active={active === "profile"} href={tabs[3].href} />
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
  desk,
}: {
  label: string;
  icon: "explore" | "dashboard" | "volunteer-activism" | "campaign" | "warehouse" | "account-circle" | "receipt-long" | "group";
  active: boolean;
  href: Href;
  desk?: boolean;
}) {
  const path = usePathname();
  const on = desk ? colors.onPrimary : colors.primary;
  const off = desk ? colors.primarySoft : colors.outline;
  return (
    <Tap
      onPress={() => {
        if (path === href) return;
        router.navigate(href);
      }}
      style={styles.tab}
      accessibilityLabel={label}
    >
      <Icon name={icon} size={22} color={active ? on : off} />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={[styles.tabLabel, { color: active ? on : off }]}
      >
        {label}
      </Text>
    </Tap>
  );
}

const actions: { label: string; href: Href; tone?: "ghost"; roles?: string[] }[] = [
  { label: "Lập phiếu tiếp nhận", href: "/receive/new", roles: ["STAFF", "STATION_MANAGER", "ADMIN"] },
  { label: "Mang đồ tới trạm", href: "/stations/map" },
  { label: "Đăng ký tổ chức", href: "/organization", tone: "ghost", roles: ["USER"] },
  { label: "Việc tình nguyện", href: "/volunteer/tasks", tone: "ghost" },
  { label: "Ca trực", href: "/shifts", tone: "ghost", roles: ["STATION_MANAGER", "ORG_MANAGER", "STAFF"] },
  { label: "Vận hành", href: "/desk", tone: "ghost" },
];

function MemberCard({ onClose }: { onClose: () => void }) {
  const { user } = useSession();
  return (
    <>
      <Title>Thẻ thành viên quyên góp</Title>
      <Body>Đọc các dòng này cho nhân viên quầy. App không tạo phiếu quyên góp cho người dùng.</Body>
      <Text style={{ fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.ink }}>{user?.fullName || "Chưa có họ tên"}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.primary }}>{user?.username || ""}</Text>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 22, color: colors.ink }}>{user?.phone || "Chưa có số điện thoại"}</Text>
      <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: colors.muted }}>{user?.email || "Chưa có email"}</Text>
      <Button label="Tới trạm gom" onPress={() => { onClose(); router.push("/stations/list"); }} />
      <Button label="Đóng" tone="ghost" onPress={onClose} />
    </>
  );
}

function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useSession();
  const { canSwitch, setMode } = useShell();
  const visible = actions.filter((action) => {
    if (action.href === "/desk") return user?.role === "STAFF";
    if (action.href === "/stations/map" || action.href === "/volunteer/tasks") {
      return !user || user.role === "USER" || user.role === "VOLUNTEER";
    }
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
        {user?.role === "USER" ? <MemberCard onClose={onClose} /> : null}
        {canSwitch ? (
          <>
            <Title>Đóng góp</Title>
            <Body>Tài khoản quản lý tổ chức vẫn tặng đồ tại trạm như người dùng.</Body>
            <Button label="Mang đồ tới trạm" onPress={() => { onClose(); router.push("/stations/map"); }} />
            <Button label="Việc tình nguyện" tone="ghost" onPress={() => { onClose(); router.push("/volunteer/tasks"); }} />
            <Button label="Chế độ quản lý" tone="ghost" onPress={() => { onClose(); setMode("desk"); }} />
          </>
        ) : null}
        {user?.role === "USER" || canSwitch ? null : <Title>Bạn muốn làm gì?</Title>}
        {user?.role === "USER" || canSwitch ? null : visible.map((action) => (
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
        {user?.role === "USER" ? null : <Button label="Đóng" tone="ghost" onPress={onClose} />}
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
  deskHeader: { backgroundColor: colors.primary },
  deskKicker: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 16, color: colors.primarySoft },
  deskName: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: colors.onPrimary },
  deskSwitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deskSwitchText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  deskBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.primary,
    paddingTop: 8,
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
  tab: { flex: 1, alignItems: "center", gap: 2, minWidth: 0, paddingBottom: 4 },
  tabLabel: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, height: 14, textAlign: "center", width: "100%" },
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
