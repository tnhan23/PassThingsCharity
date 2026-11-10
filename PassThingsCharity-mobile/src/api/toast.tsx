import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Tap } from "@/components/ui";
import { colors, fonts } from "@/theme";

export type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  show: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const hideAfterMs = 2800;
const enter = { duration: 220, easing: Easing.out(Easing.cubic) };
const leave = { duration: 180, easing: Easing.in(Easing.quad) };
const recentFlash = { message: "", at: 0 };

function toneColors(tone: ToastTone) {
  if (tone === "error") {
    return {
      background: colors.errorSoft,
      border: "#f3b8b3",
      ink: colors.error,
      icon: "error-outline" as const,
    };
  }
  if (tone === "info") {
    return {
      background: colors.surfaceContainer,
      border: colors.line,
      ink: colors.ink,
      icon: "info-outline" as const,
    };
  }
  return {
    background: colors.primarySoft,
    border: colors.hairline,
    ink: colors.primary,
    icon: "check-circle" as const,
  };
}

function ToastCard({
  item,
  onDone,
}: {
  item: ToastItem;
  onDone: (id: number) => void;
}) {
  const progress = useSharedValue(0);
  const look = toneColors(item.tone);

  useEffect(() => {
    progress.value = withTiming(1, enter);
    const timer = setTimeout(() => {
      progress.value = withTiming(0, leave, (finished) => {
        if (finished) runOnJS(onDone)(item.id);
      });
    }, hideAfterMs);
    return () => clearTimeout(timer);
  }, [item.id, onDone, progress]);

  const motion = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -16 }, { scale: 0.96 + progress.value * 0.04 }],
  }));

  return (
    <Animated.View
      style={[
        {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: look.border,
          backgroundColor: look.background,
          paddingHorizontal: 14,
          paddingVertical: 12,
          shadowColor: colors.ink,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        },
        motion,
      ]}
    >
      <Tap
        accessibilityLabel="Đóng thông báo"
        onPress={() => {
          progress.value = withTiming(0, leave, (finished) => {
            if (finished) runOnJS(onDone)(item.id);
          });
        }}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
      >
        <Icon name={look.icon} size={20} color={look.ink} />
        <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: look.ink }}>
          {item.message}
        </Text>
      </Tap>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const now = Date.now();
    if (trimmed === recentFlash.message && now - recentFlash.at < hideAfterMs + 400) return;
    recentFlash.message = trimmed;
    recentFlash.at = now;
    const id = nextId.current;
    nextId.current += 1;
    setItems((current) => [...current.slice(-2), { id, message: trimmed, tone }]);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          top: insets.top + 10,
          zIndex: 1000,
          gap: 8,
        }}
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDone={remove} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    return {
      show: () => undefined,
    };
  }
  return value;
}

export function toastToneFromError(isError: boolean): ToastTone {
  return isError ? "error" : "success";
}
