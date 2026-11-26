import { Host, TextInput, useNativeState } from "@expo/ui";
import { useEffect, type ComponentProps, type ReactNode } from "react";
import { View } from "react-native";
import { Layout, Shape, Spacing, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "./themed-text";

type InputProps = ComponentProps<typeof TextInput>;
type FormFieldProps = Omit<
  InputProps,
  "value" | "onChangeText" | "textStyle"
> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  endAccessory?: ReactNode;
};

/** Bridges controlled forms to Expo UI's observable input, including secret clears. */
export function FormField({
  label,
  value,
  onChangeText,
  style,
  endAccessory,
  ...props
}: FormFieldProps) {
  const colors = useTheme();
  const nativeValue = useNativeState(value);
  useEffect(() => {
    nativeValue.set(value);
  }, [nativeValue, value]);
  return (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={{ position: "relative" }}>
        <Host
          style={{ width: "100%" }}
          matchContents={{ vertical: true }}
          seedColor={colors.primary}
        >
          <TextInput
            {...props}
            accessibilityLabel={props.accessibilityLabel ?? label}
            value={nativeValue}
            onChangeText={(next) => {
              nativeValue.set(next);
              onChangeText(next);
            }}
            textStyle={{ ...Typography.default, color: colors.text }}
            style={{
              width: "100%",
              height: null,
              paddingHorizontal: Layout.fieldPadding,
              paddingVertical: Layout.fieldPadding,
              paddingRight: endAccessory
                ? Layout.fieldPadding + Layout.minimumTouchTarget
                : Layout.fieldPadding,
              borderWidth: 1,
              borderColor:
                props.editable === false
                  ? colors.border
                  : colors.backgroundSelected,
              borderRadius: Shape.control,
              backgroundColor: colors.backgroundElement,
              ...style,
            }}
          />
        </Host>
        {endAccessory && (
          <View
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              justifyContent: "center",
            }}
          >
            {endAccessory}
          </View>
        )}
      </View>
    </View>
  );
}
