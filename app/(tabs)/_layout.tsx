import { Stack } from "expo-router";

export default function TabLayout() {
  // هذا المكدس يحافظ على مسار /(tabs) المتوافق مع التنقل القائم، من دون إنشاء شريط تبويبات Expo الافتراضي.
  return <Stack screenOptions={{ headerShown: false, animation: "fade", animationDuration: 220 }}><Stack.Screen name="index" /></Stack>;
}
