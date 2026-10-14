import { router, usePathname } from "expo-router";
import { type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/api/session";
import { Icon, Tap } from "@/components/ui";
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
            paddingBottom: insets.bottom + 108,
            gap: 14,
          }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingBottom: insets.bottom + 88 }}>{children}</View>
      )}
      <TabBar active={tab} />
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
            <Text style={styles.logo}>PASS ĐỒ</Text>
            <View style={styles.year}>
              <Text style={styles.yearText}>2025</Text>
            </View>
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

function TabBar({ active }: { active: TabKey }) {
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
        onPress={() => router.push("/menu")}
        style={styles.plus}
        accessibilityLabel="Tạo mới"
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
  return (
    <Tap onPress={() => router.push(href)} style={styles.tab} accessibilityLabel={label}>
      <Icon name={icon} size={22} color={active ? colors.primary : colors.outline} />
      <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.outline }]}>{label}</Text>
    </Tap>
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
  brand: { flexDirection: "row", alignItems: "center", gap: 6 },
  logo: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: 0.4, color: colors.primary },
  year: {
    backgroundColor: colors.coralSoft,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  yearText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.onSecondaryContainer },
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
});
