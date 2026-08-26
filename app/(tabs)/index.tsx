import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

const services = [
  { title: "نظام اليوزرمنجر", icon: "account-group-outline", color: "#0B63E5", route: "/service/usermanager" },
  { title: "نظام الهوتسبوت", icon: "wifi", color: "#1677E8", route: "/service/hotspot" },
  { title: "المصروفات", icon: "file-document-outline", color: "#E21C35", route: "/service/expenses" },
  { title: "الحسابات المالية", icon: "wallet-outline", color: "#E68A13", route: "/service/finance" },
  { title: "الأكتة والأومنسيوت", icon: "access-point", color: "#C97816", route: "/service/queues" },
  { title: "تصاميم الكروت", icon: "cards-outline", color: "#18A878", route: "/service/cards" },
  { title: "الأنشطة الحديثة", icon: "history", color: "#1557D8", route: "/service/activity" },
  { title: "النسخ الاحتياطية", icon: "backup-restore", color: "#D9283E", route: "/service/backups" },
  { title: "الملف الشخصي", icon: "account-outline", color: "#1748BD", route: "/service/profile" },
];

function IconButton({ icon }: { icon: keyof typeof MaterialCommunityIcons.glyphMap }) {
  return <View style={styles.iconButton}><MaterialCommunityIcons name={icon} size={20} color="#113B96" /></View>;
}

export default function HomeScreen() {
  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-[#F7FAFF]" className="px-4">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <View style={styles.topActions}>
            <IconButton icon="web" /><IconButton icon="weather-night" /><IconButton icon="logout" /><IconButton icon="power" />
          </View>
          <View style={styles.brand}><Text style={styles.brandBlue}>ALAMEER </Text><Text style={styles.brandRed}>PRO</Text><Text style={styles.sectionName}>نظام الإدارة</Text></View>
          <View style={styles.online}><View style={styles.dot} /><Text style={styles.onlineText}>متصل</Text></View>
        </View>

        <TouchableOpacity style={styles.refresh} onPress={() => undefined} activeOpacity={0.8}>
          <MaterialCommunityIcons name="refresh" size={18} color="#153A83" /><Text style={styles.refreshText}>اسحب للأسفل للتحديث</Text>
        </TouchableOpacity>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}><View style={styles.routerMark}><MaterialCommunityIcons name="router-wireless" size={22} color="white" /></View><Text style={styles.routerIp}>غير متصل</Text><TouchableOpacity style={styles.refreshCircle}><MaterialCommunityIcons name="refresh" size={22} color="white" /></TouchableOpacity></View>
          <View style={styles.statusGrid}><Stat label="إصدار الراوتر" value="—" icon="update" /><Stat label="مدة التشغيل" value="—" icon="clock-outline" /><Stat label="المعالج" value="—" icon="chip" /><Stat label="المستخدمون النشطون" value="—" icon="access-point" /></View>
        </View>

        <View style={styles.metricsRow}><Metric title="إجمالي البيع" value="—" icon="storefront-outline" /><Metric title="الكروت المباعة" value="—" icon="check-circle-outline" /></View>
        <View style={styles.metricsRow}><Metric title="الكروت المضافة" value="—" icon="database-outline" /><Metric title="الكوتات الملغاة" value="—" icon="wallet-outline" /></View>

        <View style={styles.promo}><MaterialCommunityIcons name="bullhorn-outline" size={25} color="white" /><Text style={styles.promoText}>معًا لنظام إدارة الكروت</Text><TouchableOpacity style={styles.promoButton}><Text style={styles.promoButtonText}>عرض</Text><MaterialCommunityIcons name="open-in-new" size={17} color="white" /></TouchableOpacity></View>
        <Text style={styles.heading}>الخدمات</Text>
        <View style={styles.grid}>{services.map((service) => <TouchableOpacity key={service.title} style={[styles.service, { borderColor: service.color }]} onPress={() => router.push(service.route as any)} activeOpacity={0.82}><View style={[styles.serviceIcon, { backgroundColor: `${service.color}18` }]}><MaterialCommunityIcons name={service.icon as any} size={28} color={service.color} /></View><Text style={styles.serviceText}>{service.title}</Text></TouchableOpacity>)}</View>
        <View style={styles.bottomActions}><TouchableOpacity style={[styles.bigAction, styles.blueAction]}><MaterialCommunityIcons name="information-outline" size={26} color="white" /><Text style={styles.bigActionText}>حول التطبيق</Text></TouchableOpacity><TouchableOpacity style={[styles.bigAction, styles.redAction]}><MaterialCommunityIcons name="face-agent" size={26} color="white" /><Text style={styles.bigActionText}>الإرشاد والمساعدة</Text></TouchableOpacity></View>
      </ScrollView>
      <View style={styles.nav}><Nav icon="home" label="الرئيسية" active /><Nav icon="wifi" label="الخدمات" /><TouchableOpacity style={styles.plus}><MaterialCommunityIcons name="plus" size={32} color="white" /></TouchableOpacity><Nav icon="format-list-bulleted" label="التقارير" /><Nav icon="account" label="الملف" /></View>
    </ScreenContainer>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }) { return <View style={styles.stat}><MaterialCommunityIcons name={icon} size={17} color="white" /><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>; }
function Metric({ title, value, icon }: { title: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }) { return <View style={styles.metric}><View style={styles.metricIcon}><MaterialCommunityIcons name={icon} size={23} color="#1D62D6" /></View><View><Text style={styles.metricTitle}>{title}</Text><Text style={styles.metricValue}>{value}</Text></View></View>; }
function Nav({ icon, label, active }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; active?: boolean }) { return <TouchableOpacity style={styles.navItem}><MaterialCommunityIcons name={icon} size={24} color={active ? "#0B50C6" : "#14398C"} /><Text style={[styles.navText, active && styles.activeNav]}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({ content: { paddingTop: 8, paddingBottom: 110, gap: 10 }, topBar: { backgroundColor: "white", borderRadius: 22, padding: 10, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#D6E1F5" }, topActions: { flexDirection: "row", gap: 5 }, iconButton: { width: 31, height: 31, borderRadius: 10, backgroundColor: "#F7FAFF", justifyContent: "center", alignItems: "center" }, brand: { alignItems: "center" }, brandBlue: { color: "#123F95", fontFamily: "CairoExtraBold", fontWeight: "900", fontSize: 18 }, brandRed: { color: "#E11D34", fontFamily: "CairoExtraBold", fontWeight: "900", fontSize: 18, position: "absolute", left: 58 }, sectionName: { color: "#102A62", fontSize: 11, marginTop: 2 }, online: { flexDirection: "row", alignItems: "center", backgroundColor: "#EDF9F0", borderRadius: 15, paddingHorizontal: 8, paddingVertical: 5 }, dot: { width: 8, height: 8, borderRadius: 8, backgroundColor: "#18A957", marginRight: 4 }, onlineText: { color: "#12833C", fontSize: 11, fontFamily: "CairoExtraBold", fontWeight: "700" }, refresh: { height: 34, borderRadius: 18, borderWidth: 1, borderColor: "#AFC8EE", backgroundColor: "#F0F6FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, refreshText: { color: "#183B82", fontSize: 12, fontFamily: "CairoExtraBold", fontWeight: "600" }, statusCard: { borderRadius: 19, padding: 12, backgroundColor: "#123DAD" }, statusHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 8 }, routerMark: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#E21D36", alignItems: "center", justifyContent: "center" }, routerIp: { flex: 1, color: "white", fontSize: 18, fontFamily: "CairoExtraBold", fontWeight: "800", textAlign: "right" }, refreshCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#2073E5", justifyContent: "center", alignItems: "center" }, statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, stat: { width: "48%", borderRadius: 12, backgroundColor: "#194CC2", padding: 8, minHeight: 45 }, statLabel: { color: "#E1E9FF", fontSize: 10, textAlign: "right" }, statValue: { color: "white", fontSize: 12, fontFamily: "CairoExtraBold", fontWeight: "800", textAlign: "right" }, metricsRow: { flexDirection: "row-reverse", gap: 8 }, metric: { flex: 1, borderRadius: 16, backgroundColor: "white", borderWidth: 1, borderColor: "#C9D8F1", padding: 10, flexDirection: "row-reverse", alignItems: "center", gap: 8 }, metricIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: "#EDF4FF", alignItems: "center", justifyContent: "center" }, metricTitle: { color: "#163A85", fontSize: 11, textAlign: "right" }, metricValue: { color: "#102A62", fontSize: 16, fontFamily: "CairoExtraBold", fontWeight: "900", textAlign: "right" }, promo: { borderRadius: 18, backgroundColor: "#E11D34", padding: 10, flexDirection: "row-reverse", alignItems: "center", gap: 8 }, promoText: { flex: 1, textAlign: "center", color: "white", fontFamily: "CairoExtraBold", fontWeight: "800", fontSize: 14 }, promoButton: { backgroundColor: "#BF182E", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row-reverse", gap: 4, alignItems: "center" }, promoButtonText: { color: "white", fontFamily: "CairoExtraBold", fontWeight: "800" }, heading: { color: "#102A62", fontSize: 24, fontFamily: "CairoExtraBold", fontWeight: "900", textAlign: "right", borderBottomWidth: 3, borderBottomColor: "#E11D34", alignSelf: "flex-end", paddingBottom: 3 }, grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9 }, service: { width: "31.5%", minHeight: 106, borderRadius: 18, backgroundColor: "white", borderWidth: 1.3, alignItems: "center", justifyContent: "center", padding: 7 }, serviceIcon: { width: 47, height: 47, borderRadius: 25, alignItems: "center", justifyContent: "center", marginBottom: 7 }, serviceText: { color: "#102A62", fontSize: 11, fontFamily: "CairoExtraBold", fontWeight: "800", textAlign: "center" }, bottomActions: { flexDirection: "row-reverse", gap: 9 }, bigAction: { flex: 1, borderRadius: 20, minHeight: 72, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 8 }, blueAction: { backgroundColor: "#135CDF" }, redAction: { backgroundColor: "#E11D34" }, bigActionText: { color: "white", fontSize: 14, fontFamily: "CairoExtraBold", fontWeight: "900" }, nav: { position: "absolute", bottom: 8, left: 10, right: 10, height: 68, borderRadius: 28, backgroundColor: "white", borderWidth: 1, borderColor: "#D4E1F5", flexDirection: "row-reverse", justifyContent: "space-around", alignItems: "center" }, navItem: { alignItems: "center", justifyContent: "center", minWidth: 45 }, navText: { color: "#14398C", fontSize: 10, marginTop: 2, fontFamily: "CairoExtraBold", fontWeight: "700" }, activeNav: { color: "#0B50C6" }, plus: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#D9142B", alignItems: "center", justifyContent: "center", marginTop: -25, borderWidth: 5, borderColor: "#F7FAFF" } });
