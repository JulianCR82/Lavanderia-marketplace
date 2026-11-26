/** Product palette and shared design tokens. Keep one source of truth. */

import "@/global.css";

import { Platform, type TextStyle } from "react-native";

export const Colors = {
  light: {
    text: "#26343A",
    background: "#F5F1E8",
    backgroundElement: "#FCFBF7",
    backgroundSelected: "#E4E8DF",
    textSecondary: "#5C6864",
    primary: "#234A63",
    primaryPressed: "#19394E",
    secondary: "#527A68",
    accent: "#C97852",
    border: "#D8D3C8",
    success: "#347257",
    warning: "#8A5A20",
    danger: "#A94343",
  },
  dark: {
    text: "#F2EEE5",
    background: "#18252B",
    backgroundElement: "#23343A",
    backgroundSelected: "#30443F",
    textSecondary: "#B8C2B9",
    primary: "#A4C2D0",
    primaryPressed: "#C1D7DF",
    secondary: "#9BC1A7",
    accent: "#E69A73",
    border: "#405057",
    success: "#88C2A0",
    warning: "#E9BD77",
    danger: "#E58C82",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Shape = {
  small: 8,
  control: 14,
  card: 20,
  sheet: 28,
  pill: 999,
} as const;

export const Motion = {
  press: 120,
  standard: 180,
  reveal: 260,
  sheet: 360,
  pressScale: 0.985,
  shortTravel: 6,
  longTravel: 14,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** One type ramp for product screens and existing themed components. */
export const Typography = {
  default: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  headline: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  small: { fontSize: 14, lineHeight: 21, fontWeight: "400" },
  smallBold: { fontSize: 14, lineHeight: 21, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: "400" },
  link: { fontSize: 17, lineHeight: 26, fontWeight: "500" },
  linkPrimary: { fontSize: 17, lineHeight: 26, fontWeight: "500" },
  code: { fontSize: 13, lineHeight: 20, fontFamily: Fonts.mono },
} as const satisfies Record<string, TextStyle>;

export const Layout = {
  drawerWidth: 320,
  formWidth: 520,
  minimumTouchTarget: 48,
  fieldPadding: 16,
  disabledOpacity: 0.55,
} as const;
