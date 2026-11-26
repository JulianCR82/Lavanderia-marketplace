import { Text, type TextProps } from "react-native";

import { Typography, ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
  type?: keyof typeof Typography;
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = "default",
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? "text"] },
        Typography[type],
        type === "linkPrimary" && { color: theme.primary },
        style,
      ]}
      {...rest}
    />
  );
}
