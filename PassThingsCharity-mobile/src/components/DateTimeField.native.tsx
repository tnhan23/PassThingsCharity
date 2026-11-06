import { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Body, Button } from "@/components/ui";

type PickerMode = "date" | "time";

export function DateTimeField({
  label,
  value,
  minimumDate,
  onChange,
}: {
  label: string;
  value: Date | null;
  minimumDate?: Date;
  onChange: (value: Date | null) => void;
}) {
  const [mode, setMode] = useState<PickerMode | null>(null);
  const selected = value ?? minimumDate ?? new Date();
  const dateLabel = value ? value.toLocaleDateString() : "Chọn ngày";
  const timeLabel = value
    ? value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    : "Chọn giờ";

  return (
    <View style={{ gap: 6 }}>
      <Body muted>{label}</Body>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label={dateLabel} tone="ghost" onPress={() => setMode("date")} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={timeLabel} tone="ghost" onPress={() => setMode("time")} />
        </View>
      </View>
      {mode ? (
        <View>
          <DateTimePicker
            mode={mode}
            value={selected}
            minimumDate={mode === "date" ? minimumDate : undefined}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            is24Hour
            onValueChange={(_event, nextValue) => {
              onChange(nextValue);
              if (Platform.OS === "android") setMode(null);
            }}
            onDismiss={() => setMode(null)}
          />
          {Platform.OS === "ios" ? <Button label="Xong" tone="ghost" onPress={() => setMode(null)} /> : null}
        </View>
      ) : null}
    </View>
  );
}
