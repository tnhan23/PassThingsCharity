import { createElement, useMemo } from "react";
import { View } from "react-native";
import { Body } from "@/components/ui";
import { colors, fonts } from "@/theme";

function localDate(value: Date | null) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const inputStyle = {
  flex: 1,
  minHeight: 48,
  borderRadius: 12,
  border: `1px solid ${colors.hairline}`,
  backgroundColor: colors.surface,
  padding: "0 12px",
  color: colors.ink,
  fontFamily: fonts.regular,
  fontSize: 16,
};

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
  const date = useMemo(() => localDate(value), [value]);
  const minimum = useMemo(() => localDate(minimumDate ?? null), [minimumDate]);

  return (
    <View style={{ gap: 6 }}>
      <Body muted>{label}</Body>
      {createElement("input", {
        type: "date",
        value: date,
        min: minimum || undefined,
        disabled,
        "aria-label": label,
        style: inputStyle,
        onChange: (event: { target: { value: string } }) => {
          if (!event.target.value) {
            onChange(null);
            return;
          }
          const [year, month, day] = event.target.value.split("-").map(Number);
          onChange(new Date(year, month - 1, day, 23, 59, 59));
        },
      })}
    </View>
  );
}
