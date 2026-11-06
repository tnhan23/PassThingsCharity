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

function localTime(value: Date | null) {
  if (!value) return "";
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function mergeDateTime(date: string, time: string, fallbackDate: Date) {
  const [year, month, day] = (date || localDate(fallbackDate)).split("-").map(Number);
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
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
  const date = useMemo(() => localDate(value), [value]);
  const time = useMemo(() => localTime(value), [value]);
  const minimum = useMemo(() => localDate(minimumDate ?? null), [minimumDate]);

  return (
    <View style={{ gap: 6 }}>
      <Body muted>{label}</Body>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {createElement("input", {
          type: "date",
          value: date,
          min: minimum || undefined,
          "aria-label": `${label} - ngày`,
          style: inputStyle,
          onChange: (event: { target: { value: string } }) => {
            if (!event.target.value) {
              onChange(null);
              return;
            }
            const merged = mergeDateTime(event.target.value, time, minimumDate ?? new Date());
            if (merged) onChange(merged);
          },
        })}
        {createElement("input", {
          type: "time",
          value: time,
          "aria-label": `${label} - giờ`,
          style: inputStyle,
          onChange: (event: { target: { value: string } }) => {
            const merged = mergeDateTime(date, event.target.value, minimumDate ?? new Date());
            if (merged) onChange(merged);
          },
        })}
      </View>
    </View>
  );
}
