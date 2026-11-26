import { Button, Host, Text as NativeText } from "@expo/ui";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Layout, Shape, Spacing, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** Adds async state and a stable accessible label to the platform button. */
export function ActionButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "filled",
  style,
  tone = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  style?: StyleProp<ViewStyle>;
  tone?: "primary" | "danger";
}) {
  const colors = useTheme();
  return (
    <View
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        {
          minHeight: Layout.minimumTouchTarget,
          minWidth: 0,
          width: "100%",
          gap: Spacing.two,
        },
        style,
      ]}
    >
      <Host
        style={{ width: "100%" }}
        matchContents={{ vertical: true }}
        seedColor={colors[tone]}
      >
        <Button
          disabled={disabled || loading}
          onPress={onPress}
          variant={variant}
          style={{
            width: "100%",
            height: null,
            paddingVertical: Spacing.three,
            borderRadius: Shape.control,
          }}
        >
          <NativeText
            textStyle={{
              ...Typography.headline,
              textAlign: "center",
              color: variant === "filled" ? colors.background : colors[tone],
            }}
          >
            {loading ? "Procesando…" : label}
          </NativeText>
        </Button>
      </Host>
      {loading && (
        <ActivityIndicator
          style={{
            position: "absolute",
            right: Spacing.three,
            top: Spacing.three,
          }}
          color={variant === "filled" ? colors.background : colors[tone]}
          accessibilityLabel={label}
        />
      )}
    </View>
  );
}
