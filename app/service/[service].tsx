import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PowerMenu } from "@/components/power-menu";
import { useThemeContext } from "@/lib/theme-provider";
import { useColors } from "@/hooks/use-colors";

const modules = {
  usermanager: { title: "نظام اليوزرمنجر", color: "#0B63E5", actions: ["إضافة كرت", "إدارة الكروت", "إدارة الباقات", "تقارير الدفعات", "تقارير الأجهزة", "قائمة الحظر IP Bindings", "متقدم", "النسخ الاحتياطية"] },
  hotspot: { title: "نظام الهوتسبوت", color: "#0B63E5", actions: ["إضافة كرت", "إدارة الكروت", "إدارة الباقات", "الكشف عن مستخدمي الهوتسبوت", "تقارير الهوتسبوت", "إضافة خدمة", "إضافة خدمة", "إضافة خدمة"] },
} as const;

export default function ServiceScreen() {
  const { service } = useLocalSearchParams<{ service: string }>();
  const data = modules[service as keyof typeof modules] ?? modules.usermanager;
  const { colorScheme, setColorScheme } = useThemeContext();
  const colors = useColors(colorScheme);
  const [powerVisible, setPowerVisible] = useState(false);
  const exitToConnection = () => router.replace("/connect" as any);
  const openAction = (item: string) => { if (service === "usermanager" && item === "إدارة الباقات") router.push("/service/packages" as any); };
  return <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName={colorScheme === "dark" ? "bg-[#101A2E]" : "bg-[#F8FAFF]"} className="px-4">
    <View style={[styles.top, { backgroundColor: colors.surface, borderColor: colors.border } ]}><View style={styles.actions}><Small icon="web" /><Small icon="weather-night" onPress={() => setColorScheme(colorScheme === "dark" ? "light" : "dark")} /><Small icon="logout" onPress={exitToConnection} /><Small icon="power" onPress={() => setPowerVisible(true)} /></View><View style={styles.brand}><Text style={styles.brandBlue}>ALAMEER <Text style={styles.brandRed}>PRO</Text></Text><View style={styles.online}><View style={styles.dot} /><Text style={styles.onlineText}>متصل</Text></View></View><TouchableOpacity style={styles.back} onPress={exitToConnection}><MaterialCommunityIcons name="arrow-right" size={24} color="#123F95" /></TouchableOpacity></View>
    <Text style={[styles.title, { color: colors.foreground }]}>{data.title}</Text><Text style={[styles.subtitle, { color: colors.muted }]}>إجراءات سريعة</Text>
    <FlatList data={data.actions} numColumns={2} keyExtractor={(item, i) => `${item}-${i}`} columnWrapperStyle={styles.row} contentContainerStyle={styles.list} renderItem={({ item, index }) => <TouchableOpacity style={[styles.card, { borderColor: index % 3 === 0 ? "#2B74D4" : index % 3 === 1 ? "#1DA17E" : "#E63B38", backgroundColor: colors.surface }]} activeOpacity={0.8} onPress={() => openAction(item)}><View style={[styles.cardIcon, { backgroundColor: `${index % 3 === 0 ? "#2B74D4" : index % 3 === 1 ? "#1DA17E" : "#E63B38"}16` }]}><MaterialCommunityIcons name={index === 0 ? "plus-box-outline" : index === 1 ? "card-account-details-outline" : index === 2 ? "view-grid-plus-outline" : index === 3 ? "chart-line" : index === 4 ? "router-network" : index === 5 ? "link-variant-off" : index === 6 ? "tune-variant" : "backup-restore"} size={29} color={index % 3 === 0 ? "#1E5CC4" : index % 3 === 1 ? "#16876D" : "#D92E35"} /></View><Text style={styles.cardText}>{item}</Text></TouchableOpacity>} />
    <PowerMenu visible={powerVisible} onClose={() => setPowerVisible(false)} />
  </ScreenContainer>;
}
function Small({ icon, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; onPress?: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.small} activeOpacity={0.7}><MaterialCommunityIcons name={icon} size={18} color="#123F95" /></TouchableOpacity>; }
const styles = StyleSheet.create({ top: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", borderRadius: 20, padding: 8, borderWidth: 1, borderColor: "#D5E1F4" }, actions: { flexDirection: "row", gap: 4 }, small: { width: 29, height: 29, borderRadius: 10, backgroundColor: "#F7FAFF", alignItems: "center", justifyContent: "center" }, brand: { alignItems: "center", gap: 2 }, brandBlue: { color: "#123F95", fontSize: 16, fontFamily: "CairoExtraBold", fontWeight: "900" }, brandRed: { color: "#DF1D36" }, online: { flexDirection: "row", alignItems: "center", gap: 4 }, dot: { width: 7, height: 7, borderRadius: 7, backgroundColor: "#1BA455" }, onlineText: { color: "#12833C", fontSize: 10, fontFamily: "CairoExtraBold", fontWeight: "700" }, back: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#F4F8FF", alignItems: "center", justifyContent: "center" }, title: { marginTop: 26, color: "#102A62", fontSize: 27, fontFamily: "CairoExtraBold", fontWeight: "900", textAlign: "right", borderRightWidth: 4, borderRightColor: "#DF1D36", paddingRight: 10 }, subtitle: { color: "#8290A8", fontSize: 14, textAlign: "right", marginTop: 2, marginBottom: 15 }, list: { paddingBottom: 25 }, row: { gap: 12, marginBottom: 12, flexDirection: "row-reverse" }, card: { width: "48%", minHeight: 178, borderRadius: 21, backgroundColor: "white", borderWidth: 1.2, alignItems: "center", justifyContent: "center", padding: 10, shadowColor: "#8BA2C5", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, cardIcon: { width: 58, height: 58, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 17 }, cardText: { color: "#123B86", fontSize: 14, fontFamily: "CairoExtraBold", fontWeight: "900", textAlign: "center" } });
