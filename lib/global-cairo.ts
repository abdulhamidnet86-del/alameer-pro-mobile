import { StyleSheet, Text, TextInput, type TextStyle } from "react-native";

type TextLike = {
  render?: (props: Record<string, unknown>, ref?: unknown) => unknown;
  defaultProps?: { style?: TextStyle | TextStyle[] };
  __alameerCairoApplied?: boolean;
};

const CAIRO_STYLE: TextStyle = { fontFamily: "CairoExtraBold" };

function applyTo(Component: unknown) {
  const target = Component as TextLike;
  if (target.__alameerCairoApplied) return;
  const originalRender = target.render;
  if (typeof originalRender === "function") {
    target.render = (props, ref) => {
      const existing = StyleSheet.flatten(props.style as TextStyle | TextStyle[] | undefined);
      const currentFont = existing?.fontFamily ?? "";
      if (/icon|symbol/i.test(currentFont)) return originalRender(props, ref);
      return originalRender({ ...props, style: [CAIRO_STYLE, props.style as TextStyle | TextStyle[] | undefined] }, ref);
    };
  } else {
    const previous = target.defaultProps?.style;
    target.defaultProps = { ...target.defaultProps, style: previous ? [CAIRO_STYLE, ...(Array.isArray(previous) ? previous : [previous])] : CAIRO_STYLE };
  }
  target.__alameerCairoApplied = true;
}

/** يضمن استخدام ملف Cairo المضمّن محليًا حتى مع الشاشات والمكونات التي لم تضع fontFamily صراحةً. */
export function applyGlobalCairo() {
  applyTo(Text);
  applyTo(TextInput);
}
