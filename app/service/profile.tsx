import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PowerMenu } from "@/components/power-menu";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { useRouterConnection } from "@/lib/router-context";
import { useState } from "react";

export default function ProfileScreen() {
  const { connection, setConnection } = useRouterConnection();
  const { colorScheme, setColorScheme } = useThemeContext();
  const colors = useColors(colorScheme);
  const [powerVisible, setPowerVisible] = useState(false);
  const displayName = connection?.username || "غير مسجل";
  const initials = displayName.slice(0, 2).toUpperCase();
  const exit = () => { setConnection(null); router.replace("/connect" as any); };
  return <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName={colorScheme === "dark" ? "bg-[#101A2E]" : "bg-[#F8FAFF]"} className="px-4">
    <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.actions}><Small icon="web" /><Small icon="weather-night" onPress={() => setColorScheme(colorScheme === "dark" ? "light" : "dark")} /><Small icon="logout" onPress={exit} /><Small icon="power" onPress={() => setPowerVisible(true)} /></View><View style={styles.brand}><Text style={styles.brandBlue}>ALAMEER <Text style={styles.brandRed}>PRO</Text></Text><Text style={[styles.caption, { color: colors.muted }]}>الملف الشخصي</Text></View><TouchableOpacity style={styles.back} onPress={() => router.back()}><MaterialCommunityIcons name="arrow-right" size={24} color="#123F95" /></TouchableOpacity></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={[styles.identity, { backgroundColor: colors.surface, borderColor: "#8DB3F4" }]}><View style={styles.wave}><MaterialCommunityIcons name="waves" size={75} color="#BBD4FF" /></View><View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View><View style={styles.identityText}><Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text><Text style={styles.host}>{connection?.host || "لا يوجد اتصال فعلي"}</Text></View></View>
      <ProfileRow icon="account-outline" label="اسم المستخدم" value={displayName} colors={colors} />
      <ProfileRow icon="router-wireless" label="اسم الراوتر (اختياري)" value={connection?.host || "غير محدد"} colors={colors} />
      <ProfileRow icon="lan-connect" label="طريقة الاتصال" value={connection ? (connection.tls ? "API-SSL" : "عنوان IP") : "غير متصل"} colors={colors} />
      <ProfileRow icon="web" label="اللغة" value="العربية" colors={colors} />
      <ProfileRow icon="palette-outline" label="السمة" value={colorScheme === "dark" ? "داكن" : "فاتح"} colors={colors} onPress={() => setColorScheme(colorScheme === "dark" ? "light" : "dark")} />
      <ProfileRow icon="fingerprint" label="معرّف الحساب" value={connection ? "جلسة محلية آمنة" : "غير متاح"} colors={colors} />
      <ProfileRow icon="check-circle-outline" label="حالة الحساب" value={connection ? "مفعّل" : "غير متصل"} colors={colors} valueColor={connection ? "#17A66B" : "#D52239"} />
      <ProfileRow icon="account-cog-outline" label="نوع الحساب" value={connection ? "إدارة الراوتر" : "غير محدد"} colors={colors} />
      <TouchableOpacity style={styles.logout} onPress={exit} activeOpacity={0.85}><Text style={styles.logoutText}>تسجيل الخروج</Text><MaterialCommunityIcons name="logout" size={23} color="#D52239" /></TouchableOpacity>
    </ScrollView>
    <PowerMenu visible={powerVisible} onClose={() => setPowerVisible(false)} />
  </ScreenContainer>;
}

function ProfileRow({ icon, label, value, colors, onPress, valueColor }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; colors: ReturnType<typeof useColors>; onPress?: () => void; valueColor?: string }) { return <TouchableOpacity style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}><View style={styles.rowIcon}><MaterialCommunityIcons name={icon} size={25} color={icon === "palette-outline" ? "#0B63E5" : "#17A66B"} /></View><View style={styles.rowText}><Text style={[styles.rowLabel, { color: colors.muted }]}>{label}</Text><Text style={[styles.rowValue, { color: valueColor ?? colors.foreground }]}>{value}</Text></View>{onPress ? <MaterialCommunityIcons name="chevron-right" size={25} color="#0B63E5" /> : <MaterialCommunityIcons name="chevron-right" size={25} color="#0B63E5" />}</TouchableOpacity>; }
function Small({ icon, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; onPress?: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.small} activeOpacity={0.7}><MaterialCommunityIcons name={icon} size={18} color="#123F95" /></TouchableOpacity>; }
const styles = StyleSheet.create({ header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderRadius: 20, padding: 8, borderWidth: 1 }, actions: { flexDirection: "row", gap: 4 }, small: { width: 29, height: 29, borderRadius: 10, backgroundColor: "#F7FAFF", alignItems: "center", justifyContent: "center" }, brand: { alignItems: "center", gap: 2 }, brandBlue: { color: "#123F95", fontSize: 16, fontFamily: "CairoExtraBold", fontWeight: "900" }, brandRed: { color: "#DF1D36" }, caption: { fontSize: 10, fontFamily: "CairoExtraBold" }, back: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#F4F8FF", alignItems: "center", justifyContent: "center" }, content: { paddingVertical: 13, gap: 10 }, identity: { minHeight: 152, borderRadius: 20, borderWidth: 1.2, overflow: "hidden", flexDirection: "row-reverse", alignItems: "center", padding: 16, gap: 18 }, wave: { position: "absolute", right: 8, bottom: -6, opacity: 0.55 }, avatar: { width: 98, height: 98, borderRadius: 50, backgroundColor: "#E3ECFF", borderWidth: 1.5, borderColor: "#8DB3F4", alignItems: "center", justifyContent: "center" }, initials: { color: "#123F95", fontSize: 32, fontFamily: "CairoExtraBold" }, identityText: { flex: 1, alignItems: "flex-end" }, name: { fontSize: 25, fontFamily: "CairoExtraBold", fontWeight: "900", textAlign: "right" }, host: { color: "#73829A", fontSize: 15, marginTop: 4 }, row: { minHeight: 78, borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, gap: 12 }, rowIcon: { width: 49, height: 49, borderRadius: 15, backgroundColor: "#EEF8F4", alignItems: "center", justifyContent: "center" }, rowText: { flex: 1, alignItems: "flex-end", gap: 2 }, rowLabel: { fontSize: 13, textAlign: "right" }, rowValue: { fontSize: 17, fontFamily: "CairoExtraBold", fontWeight: "900", textAlign: "right" }, logout: { minHeight: 62, borderRadius: 16, borderWidth: 1.3, borderColor: "#E16370", backgroundColor: "#FFF6F7", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 3 }, logoutText: { color: "#D52239", fontSize: 18, fontFamily: "CairoExtraBold", fontWeight: "900" } });

void styles;
