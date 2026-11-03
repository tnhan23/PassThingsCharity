import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { type ReactNode, useEffect } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, fonts } from "@/theme";

type IconName = keyof typeof MaterialIcons.glyphMap;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const pressIn = { duration: 120, easing: Easing.out(Easing.quad) };
const pressOut = { duration: 160, easing: Easing.out(Easing.quad) };

export function tap() {
  if (process.env.EXPO_OS === "ios") {
    void Haptics.selectionAsync();
  }
}

export function Tap({
  children,
  onPress,
  style,
  disabled,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const depth = useSharedValue(0);
  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - depth.value * 0.02 }],
    opacity: disabled ? 0.45 : 1 - depth.value * 0.08,
  }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) depth.value = withTiming(1, pressIn);
      }}
      onPressOut={() => {
        depth.value = withTiming(0, pressOut);
      }}
      onPress={() => {
        if (!disabled) tap();
        onPress?.();
      }}
      style={[style, motion]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Icon({
  name,
  size = 20,
  color = colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialIcons name={name} size={size} color={color} />;
}

export function Photo({
  uri,
  height = 160,
  width = "100%",
  radius = 0,
}: {
  uri: string;
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
}) {
  return (
    <Image
      source={{ uri }}
      style={{ height, width, backgroundColor: colors.surfaceContainer, borderRadius: radius }}
      contentFit="cover"
      transition={200}
    />
  );
}

export function Pill({
  label,
  active,
  icon,
  onPress,
}: {
  label: string;
  active?: boolean;
  icon?: IconName;
  onPress?: () => void;
}) {
  return (
    <Tap
      onPress={onPress}
      style={[styles.pill, active ? styles.pillOn : styles.pillOff]}
    >
      {icon ? <Icon name={icon} size={16} color={active ? colors.onPrimary : colors.primary} /> : null}
      <Text style={[styles.pillText, { color: active ? colors.onPrimary : colors.primary }]}>{label}</Text>
    </Tap>
  );
}

export function Button({
  label,
  onPress,
  tone = "primary",
  icon,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  tone?: "primary" | "coral" | "ghost" | "danger";
  icon?: IconName;
  disabled?: boolean;
}) {
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    coral: { bg: colors.secondary, fg: colors.onPrimary, border: colors.secondary },
    ghost: { bg: colors.card, fg: colors.primary, border: colors.line },
    danger: { bg: colors.error, fg: colors.onPrimary, border: colors.error },
  }[tone];
  return (
    <Tap
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor: palette.bg, borderColor: palette.border }]}
    >
      {icon ? <Icon name={icon} size={18} color={palette.fg} /> : null}
      <Text style={[styles.buttonText, { color: palette.fg }]}>{label}</Text>
    </Tap>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Eyebrow({ children }: { children: string }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Title({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({ children, muted }: { children: string; muted?: boolean }) {
  return <Text style={[styles.body, muted ? { color: colors.muted } : null]}>{children}</Text>;
}

export function Meter({
  value,
  max,
  label,
  unit,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
}) {
  const ratio = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const width = useSharedValue(ratio);
  useEffect(() => {
    width.value = withTiming(ratio, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [ratio, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.meterRow}>
        <Text style={styles.meterValue}>
          {value.toLocaleString("vi-VN")}
          <Text style={styles.meterMax}> / {max.toLocaleString("vi-VN")} {unit}</Text>
        </Text>
        <Text style={styles.meterPct}>{Math.round(ratio * 100)}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fill]} />
      </View>
      <Text style={styles.meterLabel}>{label}</Text>
    </View>
  );
}

export function LineItem({
  title,
  detail,
  amount,
  ok,
}: {
  title: string;
  detail: string;
  amount: string;
  ok: boolean;
}) {
  return (
    <View style={styles.line}>
      <Icon name={ok ? "check-circle" : "cancel"} size={18} color={ok ? colors.primary : colors.error} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.lineTitle}>{title}</Text>
        <Text style={styles.lineDetail}>{detail}</Text>
      </View>
      <Text style={[styles.lineAmount, { color: ok ? colors.primary : colors.error }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderCurve: "continuous",
  },
  pillOn: { backgroundColor: colors.primary },
  pillOff: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline },
  pillText: { fontFamily: fonts.semibold, fontSize: 13 },
  button: {
    minHeight: 48,
    borderRadius: 14,
    borderCurve: "continuous",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  buttonText: { fontFamily: fonts.semibold, fontSize: 15 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 16,
    gap: 10,
  },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
  },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
  meterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  meterValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, fontVariant: ["tabular-nums"] },
  meterMax: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  meterPct: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary, fontVariant: ["tabular-nums"] },
  meterLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  track: { height: 8, borderRadius: 99, backgroundColor: colors.surfaceContainer, overflow: "hidden" },
  fill: { height: 8, borderRadius: 99, backgroundColor: colors.primary },
  line: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  lineTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  lineDetail: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  lineAmount: { fontFamily: fonts.bold, fontSize: 14, fontVariant: ["tabular-nums"] },
});
