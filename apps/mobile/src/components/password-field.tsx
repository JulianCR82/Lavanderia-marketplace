import { useRef, type ComponentProps } from "react";
import type { TextInputRef } from "@expo/ui";
import { Pressable } from "react-native";
import { SymbolView } from "expo-symbols";
import { Layout, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { FormField } from "./form-field";

type PasswordFieldProps = Omit<
  ComponentProps<typeof FormField>,
  "secureTextEntry" | "endAccessory"
> & {
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
};

/** The reveal action stays inside the field without covering text or shrinking its touch target. */
export function PasswordField({
  visible,
  onVisibilityChange,
  ...props
}: PasswordFieldProps) {
  const colors = useTheme();
  const inputRef = useRef<TextInputRef>(null);
  return (
    <FormField
      {...props}
      ref={inputRef}
      secureTextEntry={!visible}
      endAccessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            visible ? "Ocultar contraseña" : "Mostrar contraseña"
          }
          accessibilityState={{
            disabled: props.editable === false,
            selected: visible,
          }}
          disabled={props.editable === false}
          onPress={() => {
            onVisibilityChange(!visible);
            inputRef.current?.focus();
          }}
          style={({ pressed }) => ({
            minHeight: Layout.minimumTouchTarget,
            minWidth: Layout.minimumTouchTarget,
            alignItems: "center",
            justifyContent: "center",
            opacity:
              props.editable === false
                ? Layout.disabledOpacity
                : pressed
                  ? 0.7
                  : 1,
          })}
        >
          <SymbolView
            name={{
              ios: visible ? "eye.slash" : "eye",
              android: visible ? "visibility_off" : "visibility",
              web: visible ? "visibility_off" : "visibility",
            }}
            size={Spacing.four}
            tintColor={colors.textSecondary}
            accessible={false}
          />
        </Pressable>
      }
    />
  );
}
