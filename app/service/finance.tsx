import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PowerMenu } from "@/components/power-menu";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { useRouterConnection } from "@/lib/router-context";
import { trpc } from "@/lib/trpc";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

export default function FinanceScreen() {
  const { connection } = useRouterConnection();
  const { colorScheme, setColorScheme } = useThemeContext();
  const colors = useColors(colorScheme);
  const [powerVisible, setPowerVisible] = useState(false);
  const [filters, setFilters] = useState({ fromDate: "", toDate: "", profile: "", nas: "", status: "approved" });
  const [filterModal, setFilterModal] = useState<"profile" | "nas" | "status" | null>(null);
  
  const input = connection ?? { host: "", port: 8728, username: "", password: "", tls: false };
  const financeQuery = trpc.routeros.finance.summary.useQuery({ connection: input, ...filters }, { enabled: Boolean(connection), retry: false });

  const data = financeQuery.data;
  const filterOptions = filterModal === "profile" ? (data?.profiles ?? []) : filterModal === "nas" ? (data?.nasValues ?? []) : ["approved", "pending", "declined", "error", "timeout", "aborted"];
  const filterLabel = (key: "profile" | "nas" | "status") => key === "profile" ? (filters.profile || "كل الباقات") : key === "nas" ? (filters.nas || "كل الأجهزة") : filters.status === "approved" ? "المعاملات المعتمدة" : filters.status || "كل الحالات";
  const refresh = () => { if (connection) financeQuery.refetch(); else Alert.alert("الاتصال مطلوب", "أدخل بيانات الراوتر واختبر الاتصال أولًا."); };

  const exportCSV = async () => {
    if (!data || data.rows.length === 0) return Alert.alert("لا توجد بيانات", "لا توجد سجلات مالية لتصديرها حاليًا.");
    try {
      const header = "الباقة,عدد الكروت,القيمة\n";
      const rows = data.rows.map(r => `${r.package},${r.cards},${r.value}`).join("\n");
      const csv = header + rows;
      const fileUri = FileSystem.cacheDirectory + `finance_report_${new Date().getTime()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "تصدير التقرير المالي" });
      } else {
        Alert.alert("المشاركة غير متاحة", "تعذر فتح واجهة المشاركة على هذا الجهاز.");
      }
    } catch (error) {
      Alert.alert("فشل التصدير", "حدث خطأ أثناء تجهيز ملف CSV.");
    }
  };

  return <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName={colorScheme === "dark" ? "bg-[#101A2E]" : "bg-[#F8FAFF]"} className="px-4">
    <View style={[styles.top, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.actions}><Small icon="web" /><Small icon="weather-night" onPress={() => setColorScheme(colorScheme === "dark" ? "light" : "dark")} /><Small icon="logout" onPress={() => router.replace("/connect" as any)} /><Small icon="power" onPress={() => setPowerVisible(true)} /></View><View style={styles.brand}><Text style={styles.brandBlue}>ALAMEER <Text style={styles.brandRed}>PRO</Text></Text><Text style={[styles.caption, { color: colors.muted }]}>الحسابات المالية</Text></View><TouchableOpacity style={styles.back} onPress={() => router.back()}><MaterialCommunityIcons name="arrow-right" size={24} color="#123F95" /></TouchableOpacity></View>
    
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={financeQuery.isFetching} onRefresh={refresh} colors={["#1557D8"]} tintColor="#1557D8" />}>
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.heroHeader}><View style={styles.heroIcon}><MaterialCommunityIcons name="bank-outline" size={30} color="#124CC0" /></View><View style={styles.heroTitleWrap}><Text style={[styles.heroTitle, { color: colors.foreground }]}>الحسابات المالية</Text><Text style={styles.lastUpdate}>آخر تحديث: {data?.lastSyncAt ? new Date(data.lastSyncAt).toLocaleString("ar-YE") : "—"}</Text></View></View>
        <View style={styles.heroButtons}><TouchableOpacity style={styles.syncBtn} onPress={refresh} disabled={financeQuery.isFetching}><MaterialCommunityIcons name="sync" size={22} color="white" /><Text style={styles.syncText}>مزامنة الآن</Text></TouchableOpacity><TouchableOpacity style={styles.csvBtn} onPress={exportCSV}><MaterialCommunityIcons name="file-export-outline" size={22} color="#102A62" /><Text style={styles.csvText}>تصدير CSV</Text></TouchableOpacity><TouchableOpacity style={styles.refreshBtn} onPress={refresh}><MaterialCommunityIcons name="refresh" size={22} color="#124CC0" /></TouchableOpacity></View>
      </View>

      <View style={styles.filters}>
        <View style={styles.filterRow}><DateFilter label="من تاريخ" value={filters.fromDate} onChange={(value) => setFilters((current) => ({ ...current, fromDate: value }))} /><DateFilter label="إلى تاريخ" value={filters.toDate} onChange={(value) => setFilters((current) => ({ ...current, toDate: value }))} /></View>
        <View style={styles.filterRow}><FilterSelect label={filterLabel("profile")} icon="layers-triple" onPress={() => setFilterModal("profile")} /><FilterSelect label={filterLabel("nas")} icon="router-wireless" onPress={() => setFilterModal("nas")} /></View>
        <FilterSelect label="كل نقاط البيع" icon="storefront-outline" full />
        <FilterSelect label={filterLabel("status")} icon="filter-variant" full onPress={() => setFilterModal("status")} />
        <View style={styles.filterActions}><TouchableOpacity style={styles.viewBtn} onPress={refresh}><MaterialCommunityIcons name="eye-outline" size={24} color="white" /></TouchableOpacity><TouchableOpacity style={styles.pdfBtn} onPress={exportCSV}><MaterialCommunityIcons name="file-pdf-box" size={22} color="#102A62" /><Text style={styles.pdfText}>تصدير التقرير</Text></TouchableOpacity><TouchableOpacity style={styles.clearBtn} onPress={() => setFilters({ fromDate: "", toDate: "", profile: "", nas: "", status: "approved" })}><MaterialCommunityIcons name="close" size={22} color="#102A62" /></TouchableOpacity></View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="إجمالي الكروت" value={String(data?.totals.totalCards ?? "—")} icon="layers-triple" color="#1255D6" />
        <StatCard label="الكروت المباعة" value={String(data?.totals.soldCards ?? "—")} icon="check-circle-outline" color="#18A957" success />
        <StatCard label="الكروت المنتهية" value={String(data?.totals.expiredCards ?? "—")} icon="close-circle-outline" color="#D52239" error />
        <StatCard label="إجمالي البيع" value={data?.totals.revenue !== undefined ? `${data.totals.revenue} ${data.currency || ""}` : "—"} icon="cash-register" color="#1255D6" />
        <StatCard label="إجمالي المصروفات" value="—" icon="wallet-outline" color="#E68A13" warning />
        <StatCard label="الربح" value="—" icon="trending-up" color="#18A957" success />
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}><Text style={styles.headerCell}>الباقة</Text><Text style={styles.headerCell}>عدد الكروت</Text><Text style={styles.headerCell}>القيمة</Text></View>
        {data?.rows.map((row, i) => <View key={row.package} style={[styles.tableRow, i % 2 === 1 && styles.rowAlt]}><Text style={styles.cell}>{row.package}</Text><Text style={styles.cell}>{row.cards}</Text><Text style={styles.cell}>{row.value}</Text></View>)}
        <View style={styles.tableFooter}><Text style={styles.footerCell}>الإجمالي</Text><Text style={styles.footerCell}>{data?.totals.totalCards ?? 0}</Text><Text style={styles.footerCell}>{data?.totals.revenue ?? 0}</Text></View>
      </View>

      <View style={styles.bottomSummary}><SummaryItem icon="filter-variant" label="المجموعين" value={`${data?.profiles.length ?? 0}/${data?.profiles.length ?? 0}`} /><SummaryItem icon="check-circle-outline" label="المعاملات المعتمدة" value={String(data?.totals.approvedPayments ?? 0)} /><SummaryItem icon="layers-triple" label="الكروت" value={String(data?.totals.totalCards ?? 0)} /></View>
    </ScrollView>
    <Modal visible={Boolean(filterModal)} transparent animationType="fade" onRequestClose={() => setFilterModal(null)}><View style={styles.modalBackdrop}><View style={[styles.filterModal, { backgroundColor: colors.surface }]}><Text style={[styles.modalTitle, { color: colors.foreground }]}>اختيار {filterModal === "profile" ? "الباقة" : filterModal === "nas" ? "الجهاز" : "الحالة"}</Text><TouchableOpacity style={styles.option} onPress={() => { if (filterModal) setFilters((current) => ({ ...current, [filterModal]: "" })); setFilterModal(null); }}><Text style={styles.optionText}>الكل</Text></TouchableOpacity>{filterOptions.map((option) => <TouchableOpacity key={option} style={styles.option} onPress={() => { if (filterModal) setFilters((current) => ({ ...current, [filterModal]: option })); setFilterModal(null); }}><Text style={styles.optionText}>{filterModal === "status" && option === "approved" ? "المعاملات المعتمدة" : option}</Text></TouchableOpacity>)}<TouchableOpacity style={styles.modalCancel} onPress={() => setFilterModal(null)}><Text style={styles.modalCancelText}>إلغاء</Text></TouchableOpacity></View></View></Modal>
    <PowerMenu visible={powerVisible} onClose={() => setPowerVisible(false)} />
  </ScreenContainer>;
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <View style={styles.filterItem}><TextInput value={value} onChangeText={onChange} placeholder="DD/MM/YYYY" placeholderTextColor="#9AA9BF" style={styles.filterVal} keyboardType="numbers-and-punctuation" textAlign="left" /><MaterialCommunityIcons name="calendar-range" size={20} color="#102A62" /><Text style={styles.filterLabel}>{label}</Text></View>; }
function FilterSelect({ label, icon, full, onPress }: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; full?: boolean; onPress?: () => void }) { return <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.filterSelect, full && { width: "100%" }]}><MaterialCommunityIcons name="chevron-down" size={18} color="#102A62" /><Text style={styles.selectText}>{label}</Text><MaterialCommunityIcons name={icon} size={20} color="#124CC0" /></TouchableOpacity>; }
function StatCard({ label, value, icon, color, success, error, warning }: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; success?: boolean; error?: boolean; warning?: boolean }) { return <View style={styles.statCard}><View style={styles.statInfo}><Text style={styles.statLabel}>{label}</Text><Text style={[styles.statValue, { color: success ? "#18A957" : error ? "#D52239" : "#1255D6" }]}>{value}</Text></View><View style={[styles.statIconWrap, { backgroundColor: success ? "#EDF9F0" : error ? "#FFF0F2" : warning ? "#FFF8E5" : "#EEF4FF" }]}><MaterialCommunityIcons name={icon} size={22} color={color} /></View></View>; }
function SummaryItem({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) { return <View style={styles.summaryItem}><Text style={styles.summaryVal}>{value}</Text><MaterialCommunityIcons name={icon} size={18} color="#102A62" /><Text style={styles.summaryLabel}>{label}</Text></View>; }
function Small({ icon, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; onPress?: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.small} activeOpacity={0.7}><MaterialCommunityIcons name={icon} size={18} color="#123F95" /></TouchableOpacity>; }

const styles = StyleSheet.create({ top: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderRadius: 20, padding: 8, borderWidth: 1 }, actions: { flexDirection: "row", gap: 4 }, small: { width: 29, height: 29, borderRadius: 10, backgroundColor: "#F7FAFF", alignItems: "center", justifyContent: "center" }, brand: { alignItems: "center", gap: 2 }, brandBlue: { color: "#123F95", fontSize: 16, fontFamily: "CairoExtraBold", fontWeight: "900" }, brandRed: { color: "#DF1D36" }, caption: { fontSize: 10, fontFamily: "CairoExtraBold" }, back: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#F4F8FF", alignItems: "center", justifyContent: "center" }, scroll: { paddingBottom: 40, gap: 12 }, hero: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 12 }, heroHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 12 }, heroIcon: { width: 52, height: 52, borderRadius: 15, backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center" }, heroTitleWrap: { flex: 1, alignItems: "flex-end" }, heroTitle: { fontSize: 20, fontFamily: "CairoExtraBold", fontWeight: "900" }, lastUpdate: { fontSize: 10, color: "#73829A", marginTop: 2 }, heroButtons: { flexDirection: "row-reverse", gap: 8 }, syncBtn: { flex: 1, height: 48, backgroundColor: "#1255D6", borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 }, syncText: { color: "white", fontFamily: "CairoExtraBold", fontWeight: "800" }, csvBtn: { flex: 1, height: 48, backgroundColor: "white", borderWidth: 1, borderColor: "#D1DCEB", borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 }, csvText: { color: "#102A62", fontFamily: "CairoExtraBold", fontWeight: "800" }, refreshBtn: { width: 48, height: 48, backgroundColor: "white", borderWidth: 1, borderColor: "#D1DCEB", borderRadius: 14, alignItems: "center", justifyContent: "center" }, filters: { gap: 8 }, filterRow: { flexDirection: "row-reverse", gap: 8 }, filterItem: { flex: 1, height: 48, backgroundColor: "white", borderWidth: 1, borderColor: "#1255D6", borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 10, gap: 6 }, filterLabel: { color: "#102A62", fontSize: 11, fontFamily: "CairoExtraBold" }, filterVal: { flex: 1, color: "#102A62", fontSize: 12, textAlign: "left", paddingVertical: 0 }, filterSelect: { width: "48%", height: 48, backgroundColor: "white", borderWidth: 1, borderColor: "#D1DCEB", borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 10, gap: 8 }, selectText: { flex: 1, color: "#102A62", fontSize: 12, textAlign: "right" }, filterActions: { flexDirection: "row-reverse", gap: 8 }, viewBtn: { width: 54, height: 48, backgroundColor: "#1255D6", borderRadius: 14, alignItems: "center", justifyContent: "center" }, pdfBtn: { flex: 1, height: 48, backgroundColor: "white", borderWidth: 1, borderColor: "#D1DCEB", borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 }, pdfText: { color: "#102A62", fontFamily: "CairoExtraBold", fontWeight: "800" }, clearBtn: { width: 54, height: 48, backgroundColor: "white", borderWidth: 1, borderColor: "#D1DCEB", borderRadius: 14, alignItems: "center", justifyContent: "center" }, statsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }, statCard: { width: "48.5%", height: 72, backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#D1DCEB", flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 10, gap: 8 }, statInfo: { flex: 1, alignItems: "flex-end" }, statLabel: { color: "#73829A", fontSize: 10, fontFamily: "CairoExtraBold" }, statValue: { fontSize: 16, fontFamily: "CairoExtraBold", fontWeight: "900" }, statIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" }, table: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#D1DCEB", marginTop: 5 }, tableHeader: { height: 42, backgroundColor: "#1255D6", flexDirection: "row-reverse", alignItems: "center" }, headerCell: { flex: 1, color: "white", textAlign: "center", fontSize: 12, fontFamily: "CairoExtraBold" }, tableRow: { height: 40, backgroundColor: "white", flexDirection: "row-reverse", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F0F4F8" }, rowAlt: { backgroundColor: "#F9FBFF" }, cell: { flex: 1, color: "#102A62", textAlign: "center", fontSize: 12 }, tableFooter: { height: 42, backgroundColor: "#EEF4FF", flexDirection: "row-reverse", alignItems: "center" }, footerCell: { flex: 1, color: "#1255D6", textAlign: "center", fontSize: 13, fontFamily: "CairoExtraBold" }, bottomSummary: { flexDirection: "row-reverse", backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#D1DCEB", padding: 10, gap: 8 }, summaryItem: { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 5 }, summaryLabel: { color: "#73829A", fontSize: 10 }, modalBackdrop: { flex: 1, backgroundColor: "#071330A8", justifyContent: "center", padding: 18 }, filterModal: { maxHeight: "80%", borderRadius: 22, padding: 16, gap: 7 }, modalTitle: { fontSize: 18, fontFamily: "CairoExtraBold", fontWeight: "900", textAlign: "right", marginBottom: 8, color: "#102A62" }, option: { minHeight: 44, borderRadius: 12, backgroundColor: "#F7FAFF", justifyContent: "center", paddingHorizontal: 12 }, optionText: { color: "#102A62", textAlign: "right", fontFamily: "CairoExtraBold" }, modalCancel: { height: 44, borderRadius: 12, backgroundColor: "#EEF2F8", justifyContent: "center", alignItems: "center", marginTop: 4 }, modalCancelText: { color: "#183A7E", fontFamily: "CairoExtraBold" }, summaryVal: { color: "#102A62", fontSize: 11, fontFamily: "CairoExtraBold" } });
