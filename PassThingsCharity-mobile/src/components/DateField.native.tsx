import { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Body, Button } from "@/components/ui";

export function DateField({
  label,
  value,
  minimumDate,
  disabled,
  onChange,
}: {
  label: string;
  value: Date | null;
  minimumDate?: Date;
  disabled?: boolean;
  onChange: (value: Date | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = value ?? minimumDate ?? new Date();

  return (
    <View style={{ gap: 6 }}>
      <Body muted>{label}</Body>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={value ? value.toLocaleDateString() : "Chọn ngày"}
            tone="ghost"
            disabled={disabled}
            onPress={() => setIsOpen(true)}
          />
        </View>
        {value ? <Button label="Xóa" tone="ghost" onPress={() => onChange(null)} /> : null}
      </View>
      {isOpen ? (
        <View>
          <DateTimePicker
            mode="date"
            value={selected}
            minimumDate={minimumDate}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onValueChange={(_event, nextValue) => {
              onChange(nextValue);
              if (Platform.OS === "android") setIsOpen(false);
            }}
            onDismiss={() => setIsOpen(false)}
          />
          {Platform.OS === "ios" ? <Button label="Xong" tone="ghost" onPress={() => setIsOpen(false)} /> : null}
        </View>
      ) : null}
    </View>
  );
}
