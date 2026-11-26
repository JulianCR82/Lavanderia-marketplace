import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Layout, Shape, Spacing, type ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText as Text } from "./themed-text";

const icons = {
  person: {
    ios: "person.crop.circle",
    android: "account_circle",
    web: "account_circle",
  },
  home: { ios: "house", android: "home", web: "home" },
  shield: { ios: "shield", android: "shield", web: "shield" },
  mail: { ios: "envelope", android: "mail", web: "mail" },
  lock: { ios: "lock", android: "lock", web: "lock" },
  phone: { ios: "iphone", android: "smartphone", web: "smartphone" },
  browser: {
    ios: "desktopcomputer",
    android: "desktop_windows",
    web: "desktop_windows",
  },
  arrow: {
    ios: "chevron.right",
    android: "chevron_right",
    web: "chevron_right",
  },
  laundry: {
    ios: "washer",
    android: "local_laundry_service",
    web: "local_laundry_service",
  },
  check: {
    ios: "checkmark.circle",
    android: "check_circle",
    web: "check_circle",
  },
  info: { ios: "info.circle", android: "info", web: "info" },
  exit: {
    ios: "rectangle.portrait.and.arrow.right",
    android: "logout",
    web: "logout",
  },
} as const;
export type ProductIcon = keyof typeof icons;

export function AppIcon({
  name,
  color = "primary",
  size = Spacing.four,
}: {
  name: ProductIcon;
  color?: ThemeColor;
  size?: number;
}) {
  const colors = useTheme();
  return (
    <SymbolView
      name={icons[name]}
      size={size}
      tintColor={colors[color]}
      accessible={false}
    />
  );
}

export function IconBadge({
  icon,
  selected = false,
}: {
  icon: ProductIcon;
  selected?: boolean;
}) {
  const colors = useTheme();
  return (
    <View
      style={{
        width: Layout.minimumTouchTarget,
        height: Layout.minimumTouchTarget,
        borderRadius: Shape.control,
        backgroundColor: selected
          ? colors.backgroundSelected
          : colors.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AppIcon name={icon} />
    </View>
  );
}

export function ScreenHeading({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ProductIcon;
}) {
  return (
    <View style={{ gap: Spacing.two, paddingBottom: Spacing.two }}>
      {icon && (
        <View style={{ marginBottom: Spacing.two }}>
          <IconBadge icon={icon} selected />
        </View>
      )}
      <Text type="title" accessibilityRole="header">
        {title}
      </Text>
      {!!description && <Text themeColor="textSecondary">{description}</Text>}
    </View>
  );
}

export function Section({
  title,
  children,
  surface = false,
}: {
  title?: string;
  children: ReactNode;
  surface?: boolean;
}) {
  const colors = useTheme();
  return (
    <View style={{ gap: Spacing.three }}>
      {!!title && (
        <Text type="smallBold" accessibilityRole="header">
          {title}
        </Text>
      )}
      <View
        style={{
          gap: Spacing.three,
          ...(surface
            ? {
                padding: Spacing.three,
                borderRadius: Shape.card,
                backgroundColor: colors.backgroundElement,
              }
            : {}),
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** Custom row: Expo ListItem does not expose disabled state or an accessibility label. */
export function NavigationRow({
  title,
  subtitle,
  icon,
  onPress,
  disabled = false,
  selected = false,
  badge,
}: {
  title: string;
  subtitle?: string;
  icon: ProductIcon;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  badge?: string;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, badge, subtitle].filter(Boolean).join(". ")}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: Layout.minimumTouchTarget,
        padding: Spacing.three,
        borderRadius: Shape.card,
        backgroundColor:
          selected || pressed
            ? colors.backgroundSelected
            : colors.backgroundElement,
        flexDirection: "row",
        gap: Spacing.three,
        alignItems: "center",
        opacity: disabled ? Layout.disabledOpacity : 1,
      })}
    >
      <IconBadge icon={icon} />
      <View style={{ flex: 1, gap: Spacing.one }}>
        <Text type="headline">{title}</Text>
        {!!badge && (
          <Text type="caption" themeColor="success">
            {badge}
          </Text>
        )}
        {!!subtitle && (
          <Text type="small" themeColor="textSecondary">
            {subtitle}
          </Text>
        )}
      </View>
      <AppIcon name="arrow" color="textSecondary" size={Spacing.three} />
    </Pressable>
  );
}

export function Notice({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "danger" | "success" | "warning";
}) {
  const colors = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.two,
        backgroundColor: colors.backgroundElement,
        padding: Spacing.three,
        borderRadius: Shape.control,
      }}
    >
      <AppIcon
        name={tone === "success" ? "check" : "info"}
        color={tone === "info" ? "primary" : tone}
        size={Spacing.three}
      />
      <Text
        style={{ flex: 1 }}
        type="small"
        selectable
        themeColor={tone === "info" ? "textSecondary" : tone}
        accessibilityLiveRegion="polite"
      >
        {message}
      </Text>
    </View>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: Spacing.one }}>
      <Text type="small" themeColor="textSecondary">
        {label}
      </Text>
      <Text selectable>{value}</Text>
    </View>
  );
}
