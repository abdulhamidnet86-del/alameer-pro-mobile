import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouterConnection } from "@/lib/router-context";
import { toArabicError } from "@/lib/arabic-errors";
import { trpc } from "@/lib/trpc";

type Kind = "usermanager" | "hotspot";

function generateCode(length: number) {
  const alphabet = "0123456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export default function AddCardScreen() {
  const colors = useColors();
  const { connection } = useRouterConnection();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: Kind = params.kind === "hotspot" ? "hotspot" : "usermanager";
  const [count, setCount] = useState("1");
  const [digits, setDigits] = useState("10");
  const [prefix, setPrefix] = useState("");
  const [selectedProfile, setSelectedProfile] = useState("");
  const [selectedDesign, setSelectedDesign] = useState("");
  const packages = trpc.routeros.packages.list.useQuery(connection as any, { enabled: Boolean(connection), retry: false });
  const hotspotProfiles = trpc.routeros.list.useQuery({ connection: connection as any, resource: "hotspot.profiles", proplist: "name" } as any, { enabled: Boolean(connection), retry: false });
  const designs = trpc.routeros.cards.list.useQuery(connection as any, { enabled: Boolean(connection), retry: false });
  const addUser = trpc.routeros.add.useMutation();
  const profiles = useMemo(() => kind === "hotspot" ? (hotspotProfiles.data || []).map((row: any) => String(row.name || row["name"] || "")).filter(Boolean) : (packages.data?.profiles || []).map((row: any) => String(row.name || row["name"] || row)).filter(Boolean), [kind, hotspotProfiles.data, packages.data]);
  const selectedTemplate = useMemo(() => (designs.data || []).find((item: any) => item.designKey === selectedDesign), [designs.data, selectedDesign]);
  const createCards = async () => {
    if (!connection) return Alert.alert("الاتصال مطلوب", "اتصل بالراوتر قبل إضافة الكروت.");
    const total = Math.max(1, Math.min(500, Number.parseInt(count, 10) || 1));
    const length = Math.max(4, Math.min(16, Number.parseInt(digits, 10) || 10));
    if (!selectedProfile) return Alert.alert("الباقة مطلوبة", `اختر باقة ${kind === "hotspot" ? "Hotspot" : "User Manager"} حقيقية من الراوتر.`);
    try {
      for (let index = 0; index < total; index += 1) {
        const username = `${prefix}${generateCode(length)}`;
        const password = generateCode(Math.max(4, Math.min(16, length)));
        await addUser.mutateAsync({ connection, resource: kind === "hotspot" ? "hotspot.users" : "usermanager.users", params: kind === "hotspot" ? { name: username, password, profile: selectedProfile, comment: selectedDesign ? `التصميم: ${selectedDesign}` : "" } : { username, password, profile: selectedProfile, comment: selectedDesign ? `التصميم: ${selectedDesign}` : "" } } as any);
      }
      Alert.alert("تمت الإضافة", `تمت إضافة ${total} كرت حقيقي إلى ${kind === "hotspot" ? "Hotspot" : "User Manager"}.`);
    } catch (error) {
      Alert.alert("تعذر إضافة الكروت", toArabicError(error, "فشل تنفيذ الإضافة على الراوتر. تحقق من الصلاحيات والباقة ثم أعد المحاولة."));
    }
  };
  return <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-[#F6FBFC]" className="px-3">
    <View style={styles.header}><TouchableOpacity style={styles.back} onPress={() => router.back()}><MaterialCommunityIcons name="arrow-right" size={24} color="#123F95" /></TouchableOpacity><View style={styles.brand}><Text style={styles.brandText}>ALAMEER <Text style={styles.red}>PRO</Text></Text><Text style={styles.caption}>إضافة كروت {kind === "hotspot" ? "Hotspot" : "User Manager"}</Text></View><MaterialCommunityIcons name="card-plus-outline" size={28} color="#1684CB" /></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.foreground }]}>إضافة كروت حقيقية</Text><Text style={[styles.hint, { color: colors.muted }]}>تُضاف الحسابات مباشرة إلى الراوتر المتصل، ولا تُعرض بيانات تجريبية.</Text>
      <Panel title="مصدر الكروت"><Text style={styles.label}>نوع الخدمة</Text><View style={styles.chips}><Chip label="User Manager" active={kind === "usermanager"} onPress={() => router.replace("/service/add-card?kind=usermanager" as any)} /><Chip label="Hotspot" active={kind === "hotspot"} onPress={() => router.replace("/service/add-card?kind=hotspot" as any)} /></View><Text style={styles.label}>الباقة من الراوتر</Text><View style={styles.chips}>{(profiles.length ? profiles : ["لا توجد باقات متاحة"]).map((name) => <Chip key={name} label={name} active={selectedProfile === name} onPress={() => profiles.length && setSelectedProfile(name)} />)}</View><TouchableOpacity style={styles.refresh} onPress={() => { void packages.refetch(); void hotspotProfiles.refetch(); void designs.refetch(); }}><MaterialCommunityIcons name="refresh" size={18} color="#1684CB" /><Text style={styles.refreshText}>مزامنة الباقات والقوالب</Text></TouchableOpacity></Panel>
      <Panel title="قالب التصميم"><Text style={styles.label}>القالب المحفوظ من قسم تصاميم الكروت</Text><View style={styles.chips}>{(designs.data?.length ? designs.data : [{ designKey: "", name: "بدون قالب" }]).map((item: any) => <Chip key={item.designKey || "none"} label={item.name} active={selectedDesign === item.designKey} onPress={() => setSelectedDesign(item.designKey)} />)}</View>{selectedTemplate && <Text style={styles.hint}>تم اختيار القالب: {selectedTemplate.name} — سيُستخدم عند الطباعة والتصدير.</Text>}</Panel>
      <Panel title="بيانات الكروت"><Field label="عدد الكروت" value={count} onChangeText={setCount} keyboardType="number-pad" /><Field label="عدد أرقام اسم المستخدم" value={digits} onChangeText={setDigits} keyboardType="number-pad" /><Field label="بادئة اختيارية" value={prefix} onChangeText={setPrefix} autoCapitalize="none" /></Panel>
      <TouchableOpacity style={[styles.addButton, addUser.isPending && { opacity: 0.6 }]} disabled={addUser.isPending} onPress={() => void createCards()}><MaterialCommunityIcons name="database-plus" size={22} color="white" /><Text style={styles.buttonText}>{addUser.isPending ? "جارٍ الإضافة..." : "إضافة الكروت إلى الراوتر"}</Text></TouchableOpacity>
    </ScrollView>
  </ScreenContainer>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.panel}><Text style={styles.panelTitle}>{title}</Text>{children}</View>; }
function Field({ label, value, onChangeText, keyboardType, autoCapitalize }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "number-pad"; autoCapitalize?: "none" }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} autoCapitalize={autoCapitalize} style={styles.input} /></View>; }
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <TouchableOpacity style={[styles.chip, active && styles.activeChip]} onPress={onPress}><Text style={[styles.chipText, active && styles.activeChipText]}>{label}</Text></TouchableOpacity>; }
const styles = StyleSheet.create({ header: { minHeight: 58, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE7F0", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 8 }, back: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#F4F8FF", alignItems: "center", justifyContent: "center" }, brand: { alignItems: "center" }, brandText: { color: "#123F95", fontSize: 15, fontFamily: "CairoExtraBold" }, red: { color: "#DF1D36" }, caption: { color: "#536273", fontSize: 9, fontFamily: "CairoExtraBold" }, content: { paddingVertical: 16, gap: 12, paddingBottom: 40 }, title: { fontSize: 24, fontFamily: "CairoExtraBold", textAlign: "right" }, hint: { fontSize: 11, textAlign: "right", lineHeight: 18 }, panel: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#DCE7EA", padding: 12, gap: 10 }, panelTitle: { color: "#11828E", fontSize: 15, fontFamily: "CairoExtraBold", textAlign: "right", borderBottomWidth: 1, borderBottomColor: "#E5EEF0", paddingBottom: 8 }, label: { color: "#344052", fontSize: 11, fontFamily: "CairoExtraBold", textAlign: "right" }, chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }, chip: { backgroundColor: "#F0F5F7", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }, activeChip: { backgroundColor: "#DDF4EC", borderWidth: 1, borderColor: "#159B68" }, chipText: { color: "#718093", fontSize: 10, textAlign: "center" }, activeChipText: { color: "#087E69", fontFamily: "CairoExtraBold" }, refresh: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderRadius: 10, backgroundColor: "#EDF7FC" }, refreshText: { color: "#1684CB", fontSize: 10, fontFamily: "CairoExtraBold" }, field: { gap: 5 }, input: { height: 42, borderRadius: 10, borderWidth: 1, borderColor: "#DCE5EC", backgroundColor: "#FFFFFF", paddingHorizontal: 10, textAlign: "right", color: "#213044", fontSize: 12 }, addButton: { height: 50, borderRadius: 13, backgroundColor: "#087E9B", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 }, buttonText: { color: "#FFFFFF", fontFamily: "CairoExtraBold", fontSize: 13 } });
