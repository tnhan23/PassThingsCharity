import { router, usePathname, type Href } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { backend } from "@/api/backend";
import { type CopyKey, useLocale } from "@/api/locale";
import { useSession } from "@/api/session";
import { subscribeUnread } from "@/api/unread";
import { useShell } from "@/api/shell";
import { Body, Button, Icon, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

export type TabKey = "home" | "give" | "stations" | "profile";

function tabRoots(role: string | undefined, signedIn: boolean, desk: boolean) {
  return new Set(tabsFor(role, signedIn, desk).map((item) => String(item.href)));
}

function resolvedTab(path: string, role: string | undefined, desk: boolean, fallback: TabKey): TabKey {
  const tabs = tabsFor(role, true, desk);
  const hit = tabs.find((item) => path === item.href || (item.href !== "/" && path.startsWith(String(item.href))));
  if (hit) return hit.key;
  if (!desk) {
    if (path.startsWith("/campaign") || path.startsWith("/contribution")) return "give";
    if (path.startsWith("/stations") || path.startsWith("/station")) return "stations";
    if (path.startsWith("/profile") || path.startsWith("/account") || path.startsWith("/settings")) return "profile";
    return path === "/" ? "home" : fallback;
  }
  if (path.startsWith("/profile") || path.startsWith("/account") || path.startsWith("/settings")) return "profile";
  if (path.startsWith("/shifts")) return "give";
  if (path.startsWith("/stations") || path.startsWith("/station")) return "stations";
  return path === "/" ? "home" : fallback;
}

export function Screen({
  children,
  tab,
  scroll = true,
  nestedScrollEnabled = false,
}: {
  children: ReactNode;
  tab: TabKey;
  scroll?: boolean;
  nestedScrollEnabled?: boolean;
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
            nestedScrollEnabled={nestedScrollEnabled}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: insets.bottom + (desk ? 128 : 112),
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

function deskTitle(role: string | undefined, t: (key: CopyKey) => string) {
  if (role === "ADMIN") return t("role.admin");
  if (role === "ORG_MANAGER") return t("role.org");
  if (role === "STATION_MANAGER") return t("role.station");
  if (role === "STAFF") return t("role.staff");
  return t("nav.desk");
}

function pathTitle(path: string, t: (key: CopyKey) => string): string {
  if (path.startsWith("/desk/")) {
    const key = path.replace("/desk/", "").split("/")[0];
    const workKey = `work.${key}` as CopyKey;
    const translated = t(workKey);
    if (translated && translated !== workKey) return translated;
    if (key === "stock") return "Kho trạm";
  }
  if (path.startsWith("/campaign")) return "Chiến dịch";
  if (path.startsWith("/station/")) return "Chi tiết trạm";
  if (path.startsWith("/stations/map")) return "Bản đồ trạm";
  if (path.startsWith("/stations")) return t("nav.stations");
  if (path.startsWith("/contribution/")) return "Chi tiết phiếu";
  if (path.startsWith("/receive/new")) return "Lập phiếu tiếp nhận";
  if (path.startsWith("/receive")) return "Tiếp nhận";
  if (path.startsWith("/shifts") || path.startsWith("/shift")) return "Ca trực";
  if (path.startsWith("/jobs")) return "Việc tại trạm";
  if (path.startsWith("/volunteer")) return "Tình nguyện";
  if (path.startsWith("/organization")) return "Tổ chức";
  if (path.startsWith("/notifications") || path.startsWith("/inbox")) return t("notice.title");
  if (path.startsWith("/account")) return "Tài khoản";
  if (path.startsWith("/settings")) return "Cài đặt";
  if (path.startsWith("/search")) return "Tìm kiếm";
  if (path.startsWith("/qr")) return "Quét mã QR";
  return "";
}

function Bell({ ink }: { ink: string }) {
  const path = usePathname();
  const { token } = useSession();
  const { t } = useLocale();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!token) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    backend.myNotifications(token)
      .then((data) => {
        if (!cancelled) setUnread(data.unreadCount);
      })
      .catch(() => {
        if (!cancelled) setUnread(0);
      });
    return () => {
      cancelled = true;
    };
  }, [token, path]);
  useEffect(() => subscribeUnread(setUnread), []);
  const count = unread > 99 ? "99+" : String(unread);
  return (
    <Tap onPress={() => router.push("/notifications")} style={styles.iconBtn} accessibilityLabel={unread > 0 ? `${t("nav.bell")} ${count}` : t("nav.bell")}>
      <Icon name="notifications-none" size={22} color={ink} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </Tap>
  );
}

function Header() {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const { user } = useSession();
  const { t } = useLocale();
  const { desk, canSwitch, setMode } = useShell();
  const showBack = path !== "/login" && !tabRoots(user?.role, Boolean(user), desk).has(path);
  const currentTitle = showBack ? pathTitle(path, t) : "";
  const accountHref = user ? "/profile/full" : "/login";
  const placeHref = "/stations/list";
  if (desk) {
    const ink = colors.onPrimary;
    return (
      <View style={[styles.deskHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          {showBack ? (
            <View style={styles.backGroup}>
              <Tap onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel={t("nav.back")}>
                <Icon name="arrow-back" size={22} color={ink} />
              </Tap>
              <View style={{ flex: 1 }}>
                <Text style={styles.deskKicker}>{deskTitle(user?.role, t)}</Text>
                <Text style={styles.deskName} numberOfLines={1}>{currentTitle || t("nav.desk")}</Text>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, paddingLeft: 4 }}>
              <Text style={styles.deskKicker}>{deskTitle(user?.role, t)}</Text>
              <Text style={styles.deskName} numberOfLines={1}>{user?.fullName || user?.username || "Pass Things"}</Text>
            </View>
          )}
          {showBack && path !== "/desk" ? (
            <Tap onPress={() => router.navigate("/")} style={styles.deskHomeBtn} accessibilityLabel={t("nav.overview")}>
              <Icon name="dashboard" size={15} color={colors.onPrimary} />
              <Text style={styles.deskHomeText}>{t("nav.overview")}</Text>
            </Tap>
          ) : null}
          {canSwitch ? (
            <Tap onPress={() => setMode("member")} style={styles.deskSwitch} accessibilityLabel="Đóng góp như người dùng">
              <Icon name="volunteer-activism" size={16} color={colors.primary} />
              <Text style={styles.deskSwitchText}>Đóng góp</Text>
            </Tap>
          ) : null}
          <Bell ink={ink} />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        {showBack ? (
          <View style={styles.backGroup}>
            <Tap onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel={t("nav.back")}>
              <Icon name="arrow-back" size={22} color={colors.primary} />
            </Tap>
            {currentTitle ? (
              <Text style={styles.pageTitle} numberOfLines={1}>{currentTitle}</Text>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.brand}>
              <Text style={styles.logo}>Pass Things</Text>
              <Text style={styles.logoSub}>Charity</Text>
            </View>
            <Tap onPress={() => router.push(placeHref)} style={styles.location} accessibilityLabel="Chọn khu vực trạm">
              <Icon name="location-on" size={15} color={colors.secondary} />
              <Text style={styles.locationText} numberOfLines={1}>
                TP.HCM
              </Text>
              <Icon name="keyboard-arrow-down" size={15} color={colors.muted} />
            </Tap>
            <View style={{ flex: 1 }} />
          </>
        )}
        {canSwitch ? (
          <Tap onPress={() => setMode("desk")} style={styles.trust} accessibilityLabel="Chế độ quản lý">
            <Icon name="dashboard" size={15} color={colors.primary} />
            <Text style={styles.trustText}>Quản lý</Text>
          </Tap>
        ) : null}
        <Tap onPress={() => router.push(accountHref)} style={styles.trust} accessibilityLabel={user ? user.username : "Đăng nhập"}>
          <Icon name={user ? "verified" : "login"} size={15} color={colors.primary} />
          <Text style={styles.trustText} numberOfLines={1}>{user ? (user.fullName || user.username) : "Đăng nhập"}</Text>
        </Tap>
        <Bell ink={colors.primary} />
      </View>
    </View>
  );
}

type TabIcon = "explore" | "dashboard" | "volunteer-activism" | "warehouse" | "account-circle" | "schedule" | "map";

function tabsFor(role: string | undefined, _signedIn: boolean, desk: boolean): { key: TabKey; label: CopyKey; icon: TabIcon; href: Href }[] {
  const profile: Href = "/profile/full";
  if (!desk) {
    return [
      { key: "home", label: "nav.explore", icon: "explore", href: "/" },
      { key: "profile", label: "nav.profile", icon: "account-circle", href: profile },
    ];
  }
  const homeLabel: CopyKey = role === "STAFF" ? "nav.counter" : "nav.overview";
  if (role === "ADMIN") {
    return [
      { key: "home", label: homeLabel, icon: "dashboard", href: "/" },
      { key: "stations", label: "nav.map", icon: "map", href: "/stations/list" },
      { key: "profile", label: "nav.profile", icon: "account-circle", href: profile },
    ];
  }
  return [
    { key: "home", label: homeLabel, icon: "dashboard", href: "/" },
    { key: "give", label: "nav.shifts", icon: "schedule", href: "/shifts" },
    { key: "stations", label: "nav.map", icon: "map", href: "/stations/list" },
    { key: "profile", label: "nav.profile", icon: "account-circle", href: profile },
  ];
}

function TabBar({ active, desk, sheet, onCreate }: { active: TabKey; desk: boolean; sheet: boolean; onCreate: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { t } = useLocale();
  const tabs = tabsFor(user?.role, Boolean(user), desk);
  const bottom = Math.max(10, insets.bottom - 6);
  if (desk) {
    return (
      <View style={[styles.deskBar, { paddingBottom: bottom }]}>
        {tabs.map((item) => (
          <TabItem key={item.key} label={t(item.label)} icon={item.icon} active={active === item.key} href={item.href} desk />
        ))}
      </View>
    );
  }
  return (
    <View style={[styles.tabBar, { paddingBottom: bottom }]}>
      <TabItem label={t(tabs[0].label)} icon={tabs[0].icon} active={active === "home"} href={tabs[0].href} />
      <View style={{ width: 64 }} />
      <TabItem label={t(tabs[1].label)} icon={tabs[1].icon} active={active === "profile"} href={tabs[1].href} />
      <Tap
        onPress={onCreate}
        style={[styles.plus, sheet ? { backgroundColor: colors.secondary } : null]}
        accessibilityLabel={sheet ? "Đóng bảng tác vụ nhanh" : "Mở tác vụ nhanh"}
      >
        <Icon name={sheet ? "close" : "add"} size={28} color={colors.onPrimary} />
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
  icon: TabIcon;
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
      <View style={[styles.tabIcon, active ? (desk ? styles.tabIconDeskActive : styles.tabIconActive) : null]}>
        <Icon name={icon} size={22} color={active ? on : off} />
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.tabLabel,
          { color: active ? on : off, fontFamily: active ? fonts.bold : fonts.medium },
        ]}
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
  { label: "Việc tình nguyện", href: "/jobs", tone: "ghost" },
  { label: "Ca trực", href: "/shifts", tone: "ghost", roles: ["STATION_MANAGER", "ORG_MANAGER", "STAFF"] },
  { label: "Vận hành", href: "/desk", tone: "ghost", roles: ["ADMIN", "ORG_MANAGER", "STATION_MANAGER", "STAFF"] },
];

function MemberCard({ onClose }: { onClose: () => void }) {
  const { user } = useSession();
  return (
    <>
      <Title>Thẻ thành viên quyên góp</Title>
      <Body muted>Đưa màn hình này hoặc đọc số điện thoại / username cho nhân viên quầy để lập phiếu quyên góp.</Body>
      <View style={styles.passCard}>
        <View style={styles.passRow}>
          <Text style={styles.passLabel}>Họ và tên</Text>
          <Text style={styles.passPrimary}>{user?.fullName || "Chưa cập nhật họ tên"}</Text>
        </View>
        <View style={styles.passDivider} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.passLabel}>Số điện thoại</Text>
            <Text style={styles.passCode}>{user?.phone || "Chưa có SĐT"}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.passLabel}>Username</Text>
            <Text style={[styles.passCode, { color: colors.primary }]}>{user?.username || "—"}</Text>
          </View>
        </View>
        {user?.email ? (
          <>
            <View style={styles.passDivider} />
            <View style={styles.passRow}>
              <Text style={styles.passLabel}>Email</Text>
              <Text style={styles.passMeta}>{user.email}</Text>
            </View>
          </>
        ) : null}
      </View>
      <Button icon="warehouse" label="Tìm trạm gom gần bạn" onPress={() => { onClose(); router.push("/stations/list"); }} />
      <Button icon="volunteer-activism" label="Xem việc tình nguyện tại trạm" tone="ghost" onPress={() => { onClose(); router.push("/jobs"); }} />
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
        <View style={styles.sheetHandle} />
        {user?.role === "USER" ? <MemberCard onClose={onClose} /> : null}
        {canSwitch ? (
          <>
            <Title>Tác vụ nhanh</Title>
            <Body muted>Tài khoản quản lý vẫn có thể tặng đồ tại trạm hoặc chuyển sang bảng điều hành.</Body>
            <Button icon="map" label="Mang đồ tới trạm" onPress={() => { onClose(); router.push("/stations/map"); }} />
            <Button icon="volunteer-activism" label="Việc tình nguyện" tone="ghost" onPress={() => { onClose(); router.push("/volunteer/tasks"); }} />
            <Button icon="dashboard" label="Chế độ quản lý" tone="ghost" onPress={() => { onClose(); setMode("desk"); }} />
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
  deskKicker: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 15, color: colors.primarySoft },
  deskName: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.onPrimary },
  deskHomeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryContainer,
    borderRadius: 999,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deskHomeText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.onPrimary },
  deskSwitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    minHeight: 34,
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
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingTop: 8,
  },
  headerRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 6,
  },
  backGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  pageTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
  },
  brand: { justifyContent: "center", paddingLeft: 4 },
  logo: { fontFamily: fonts.italic, fontSize: 16, lineHeight: 18, color: colors.primary },
  logoSub: { fontFamily: fonts.italic, fontSize: 12, lineHeight: 14, color: colors.primary },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: 112,
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginLeft: 4,
  },
  locationText: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink, flexShrink: 1 },
  trust: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  trustText: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary, maxWidth: 96 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 12, color: colors.onPrimary, fontVariant: ["tabular-nums"] },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minWidth: 0, minHeight: 48 },
  tabIcon: { width: 44, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tabIconActive: { backgroundColor: colors.primarySoft },
  tabIconDeskActive: { backgroundColor: colors.primaryContainer },
  tabLabel: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, height: 14, textAlign: "center", width: "100%" },
  plus: {
    position: "absolute",
    top: -16,
    left: "50%",
    marginLeft: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 16px rgba(7, 36, 26, 0.28)",
  },
  sheetRoot: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(7, 36, 26, 0.45)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: "center",
    marginBottom: 4,
  },
  passCard: {
    backgroundColor: colors.surfaceLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 14,
    gap: 10,
  },
  passRow: { gap: 2 },
  passDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  passLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  passPrimary: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.ink },
  passCode: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.ink, fontVariant: ["tabular-nums"] },
  passMeta: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
});
