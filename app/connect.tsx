import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Network from "expo-network";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useRouterConnection } from "@/lib/router-context";
import { loadSavedRouters, saveSavedRouters } from "@/lib/router-storage";
import { useThemeContext } from "@/lib/theme-provider";
import { testLocalRouterOs } from "@/lib/routeros-direct";
import { trpc } from "@/lib/trpc";

type StatusTone = "neutral" | "success" | "error" | "working";

export default function ConnectScreen() {
  const { setConnection } = useRouterConnection();
  const { colorScheme, setColorScheme } = useThemeContext();
  const params = useLocalSearchParams<{ host?: string; port?: string; tls?: string; name?: string }>();
  const [host, setHost] = useState("");
  const [port, setPort] = useState("8728");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [secure, setSecure] = useState(false);
  const [remember, setRemember] = useState(true);
  const [syncDatabase, setSyncDatabase] = useState(true);
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [networkSummary, setNetworkSummary] = useState("جارٍ قراءة حالة الشبكة المحلية...");
  const [status, setStatus] = useState("أدخل بيانات الراوتر ثم اختبر الاتصال قبل تسجيل الدخول.");
  const [tone, setTone] = useState<StatusTone>("neutral");
  const entrance = useRef(new Animated.Value(0)).current;
  const testConnection = trpc.routeros.status.useMutation();

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [entrance]);

  useEffect(() => {
    const readNetwork = async () => {
      try {
        const [state, ip] = await Promise.all([Network.getNetworkStateAsync(), Network.getIpAddressAsync()]);
        setNetworkSummary(state.isConnected ? `الشبكة المحلية متصلة · عنوان جهازك ${ip === "0.0.0.0" ? "غير متاح" : ip}` : "لا يوجد اتصال شبكة نشط على الجهاز.");
      } catch {
        setNetworkSummary("تعذر قراءة عنوان الشبكة المحلية على هذا الجهاز.");
      }
    };
    void readNetwork();
  }, []);

  useEffect(() => {
    if (!params.host) return;
    setHost(params.host);
    setPort(params.port || "8728");
    setSecure(params.tls === "true");
    setName(params.name || "");
    setUsername("");
    setPassword("");
    setStatus("تم تحديد الراوتر. أدخل اسم مستخدم RouterOS وكلمة المرور ثم اختبر الاتصال.");
    setTone("neutral");
  }, [params.host, params.name, params.port, params.tls]);

  const connectionInput = () => ({ host: host.trim(), port: Number(port), username: username.trim(), password, tls: secure });
  const validate = () => {
    if (!host.trim()) return "أدخل عنوان IP أو اسم نطاق الراوتر.";
    if (!Number.isInteger(Number(port)) || Number(port) < 1 || Number(port) > 65535) return "المنفذ غير صحيح. استخدم 8728 للـ API أو 8729 للـ API-SSL.";
    if (!username.trim()) return "أدخل اسم مستخدم RouterOS باللغة الإنجليزية.";
    if (!password) return "أدخل كلمة المرور الخاصة بحساب RouterOS.";
    return null;
  };
  const persistConnection = async () => {
    const input = connectionInput();
    const item = { id: `${input.host}:${input.port}`, name: name.trim() || input.host, ...input };
    setConnection(item);
    if (remember) {
      const existing = await loadSavedRouters();
      await saveSavedRouters([...existing.filter((candidate) => candidate.id !== item.id), item]);
    }
  };
  const execute = async (enterSystem: boolean) => {
    const issue = validate();
    if (issue) { setStatus(issue); setTone("error"); return; }
    try {
      setTone("working");
      setStatus(enterSystem ? "جارٍ التحقق من الراوتر وتسجيل الدخول..." : "جارٍ اختبار اتصال RouterOS...");
      const input = connectionInput();
      const useLocalTcp = Platform.OS !== "web" && isLocalRouterAddress(input.host);
      const resource = useLocalTcp ? await testLocalRouterOs(input) : await testConnection.mutateAsync(input);
      if (!enterSystem) {
        setStatus(`تم اختبار الاتصال ${useLocalTcp ? "محليًا من الهاتف" : "بنجاح"}. RouterOS ${resource.version ?? "متصل"}.`);
        setTone("success");
        return;
      }
      await persistConnection();
      setStatus("تم الاتصال بنجاح. جارٍ فتح لوحة التحكم...");
      setTone("success");
      router.replace("/(tabs)" as any);
    } catch (error) {
      setTone("error");
      setStatus(formatConnectionError(error instanceof Error ? error.message : ""));
    }
  };
  const toggleSecure = (value: boolean) => { setSecure(value); setPort(value ? "8729" : "8728"); };
  const openSupport = (url: string) => Linking.openURL(url).catch(() => Alert.alert("تعذر فتح الرابط", "تحقق من وجود تطبيق الهاتف أو WhatsApp على جهازك."));

  return <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-[#F8FAFF]" className="px-3">
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
        <LinearGradient colors={["#E9142F", "#1559D8", "#0C2D85"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroShine} />
          <View style={styles.logoBox}><MaterialCommunityIcons name="router-wireless" size={33} color="#FFFFFF" /></View>
          <View style={styles.brandWrap}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.brand}>ALAMEER <Text style={styles.brandRed}>PRO</Text></Text><Text numberOfLines={1} style={styles.developer}>برمجة/ عبدالحميد داوؤد</Text></View>
          <View style={styles.heroActions}><TouchableOpacity style={styles.circleAction} activeOpacity={0.75}><MaterialCommunityIcons name="web" size={22} color="#0A3EA6" /></TouchableOpacity><TouchableOpacity style={styles.circleAction} activeOpacity={0.75} onPress={() => setColorScheme(colorScheme === "dark" ? "light" : "dark")}><MaterialCommunityIcons name={colorScheme === "dark" ? "white-balance-sunny" : "weather-night"} size={22} color="#0A3EA6" /></TouchableOpacity><View style={styles.version}><Text style={styles.versionText}>v1.0.34</Text></View></View>
        </LinearGradient>

        <View style={styles.tabs}><TouchableOpacity style={styles.activeTab} activeOpacity={0.85}><MaterialCommunityIcons name="login" size={23} color="white" /><Text style={styles.activeTabText}>بيانات الدخول</Text></TouchableOpacity><TouchableOpacity style={styles.tab} activeOpacity={0.8} onPress={() => router.replace("/routers" as any)}><MaterialCommunityIcons name="router-wireless" size={22} color="#123F95" /><Text style={styles.tabText}>الراوترات المسجلة</Text></TouchableOpacity></View>

        <SectionTitle title="طريقة الاتصال" icon="router-wireless" />
        <View style={styles.methodRow}><TouchableOpacity style={styles.methodActive} activeOpacity={0.8}><MaterialCommunityIcons name="sitemap" size={24} color="white" /><Text style={styles.methodActiveText}>عنوان (IP)</Text></TouchableOpacity><TouchableOpacity style={styles.method} activeOpacity={0.8}><MaterialCommunityIcons name="web" size={24} color="#0B3F9D" /><Text style={styles.methodText}>رابط (Domain)</Text></TouchableOpacity></View>
        <View style={styles.networkNotice}><MaterialCommunityIcons name="wifi" size={20} color="#1557D8" /><Text style={styles.networkNoticeText}>{networkSummary}</Text></View>

        <View style={styles.connectionRow}><View style={styles.portField}><Text style={styles.smallLabel}>بورت</Text><TextInput style={styles.portInput} value={port} onChangeText={setPort} keyboardType="numeric" maxLength={5} /><Text style={styles.portHint}>{secure ? "API-SSL" : "API"}</Text></View><Field label="العنوان" icon="sitemap" value={host} onChangeText={setHost} placeholder="مثال: 192.168.88.1" keyboardType="numeric" /></View>
        <Field label="اسم المستخدم" icon="account" value={username} onChangeText={setUsername} placeholder="admin" ltr />
        <Field label="كلمة المرور" icon="lock" value={password} onChangeText={setPassword} placeholder="••••••••" secure ltr />

        <View style={styles.primaryActions}><TouchableOpacity style={styles.loginButton} onPress={() => void execute(true)} disabled={testConnection.isPending} activeOpacity={0.84}><LinearGradient colors={["#EC1738", "#1557D6", "#0C3293"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginGradient}><MaterialCommunityIcons name={testConnection.isPending ? "loading" : "login"} size={24} color="white" /><Text style={styles.loginText}>{testConnection.isPending ? "جارٍ التحقق..." : "تسجيل الدخول"}</Text></LinearGradient></TouchableOpacity><TouchableOpacity style={styles.testButton} onPress={() => void execute(false)} disabled={testConnection.isPending} activeOpacity={0.75}><MaterialCommunityIcons name="connection" size={22} color="#17479F" /><Text style={styles.testText}>اختبار الاتصال</Text></TouchableOpacity><TouchableOpacity style={styles.accountButton} onPress={() => openSupport("https://wa.me/967778215553")} activeOpacity={0.75}><MaterialCommunityIcons name="account-circle-outline" size={22} color="#17479F" /><Text style={styles.testText}>معرف حسابي</Text></TouchableOpacity></View>

        <SectionTitle title="خيارات الدخول" icon="tune-variant" />
        <OptionRow icon="lock" tint="#EF1838" title="تذكر كلمة المرور" subtitle="يتم حفظها داخل التخزين الآمن للجهاز" value={remember} onChange={setRemember} />
        <OptionRow icon="sync" tint="#1557D8" title="دخول يعمل بمزامنة قاعدة البيانات" value={syncDatabase} onChange={setSyncDatabase} />
        <OptionRow icon="cloud-download-outline" tint="#1557D8" title="حفظ نسخة احتياطية للراوتر" value={backupEnabled} onChange={setBackupEnabled} />
        <OptionRow icon="tune-vertical" tint="#EF1838" title="متقدم" value={advanced} onChange={setAdvanced} />
        {advanced ? <View style={styles.advanced}><TouchableOpacity style={styles.secureToggle} onPress={() => toggleSecure(!secure)} activeOpacity={0.75}><MaterialCommunityIcons name={secure ? "shield-lock" : "shield-lock-outline"} size={21} color="#1557D8" /><View style={{ flex: 1 }}><Text style={styles.advancedTitle}>استخدام API-SSL</Text><Text style={styles.advancedHint}>فعّل 8729 عند وجود شهادة TLS على الراوتر.</Text></View><Switch value={secure} onValueChange={toggleSecure} trackColor={{ false: "#B7C3D5", true: "#1557D8" }} /></TouchableOpacity><Field label="اسم الراوتر (اختياري)" icon="router-wireless" value={name} onChangeText={setName} placeholder="راوتري الرئيسي" /></View> : null}

        <View style={[styles.statusBox, tone === "success" && styles.statusSuccess, tone === "error" && styles.statusError]}><MaterialCommunityIcons name={tone === "success" ? "check-decagram" : tone === "error" ? "alert-circle" : tone === "working" ? "progress-clock" : "information"} size={21} color={tone === "success" ? "#178452" : tone === "error" ? "#D81D38" : "#1766CF"} /><Text style={[styles.statusText, tone === "error" && styles.statusTextError]}>{status}</Text></View>
        <SupportFooter onCall={() => openSupport("tel:778215553")} onWhatsApp={() => openSupport("https://wa.me/967778215553")} />
      </Animated.View>
    </ScrollView>
  </ScreenContainer>;
}

function Field({ label, icon, value, onChangeText, placeholder, keyboardType, secure, ltr }: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "numeric" | "default"; secure?: boolean; ltr?: boolean }) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><View style={styles.fieldWrap}><MaterialCommunityIcons name={icon} size={23} color="#123F95" /><TextInput style={[styles.fieldInput, ltr && styles.ltr]} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9AA9C2" keyboardType={keyboardType} secureTextEntry={secure} autoCapitalize="none" /></View></View>; }
function SectionTitle({ title, icon }: { title: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }) { return <View style={styles.sectionTitle}><View style={styles.sectionIcon}><MaterialCommunityIcons name={icon} size={20} color="#1649A8" /></View><Text style={styles.sectionText}>{title}</Text></View>; }
function OptionRow({ icon, tint, title, subtitle, value, onChange }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; tint: string; title: string; subtitle?: string; value: boolean; onChange: (value: boolean) => void }) { return <TouchableOpacity style={styles.option} activeOpacity={0.82} onPress={() => onChange(!value)}><View style={[styles.optionIcon, { backgroundColor: `${tint}12` }]}><MaterialCommunityIcons name={icon} size={23} color={tint} /></View><View style={styles.optionCopy}><Text style={styles.optionTitle}>{title}</Text>{subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}</View><View style={[styles.check, value && styles.checkActive]}>{value ? <MaterialCommunityIcons name="check" size={18} color="white" /> : null}</View></TouchableOpacity>; }
function SupportFooter({ onCall, onWhatsApp }: { onCall: () => void; onWhatsApp: () => void }) { return <View style={styles.footer}><Text style={styles.supportTitle}>معًا لحلول شبكات أكثر ثباتًا</Text><Text style={styles.supportText}>هندسة وبرمجة: عبدالحميد داوؤد · الدعم والحلول والبرمجة: الأخ/ أحمد حزام داوؤد</Text><View style={styles.contactRow}><TouchableOpacity style={styles.contact} onPress={onWhatsApp}><MaterialCommunityIcons name="whatsapp" size={20} color="#0F925E" /><Text style={styles.contactText}>واتساب</Text></TouchableOpacity><TouchableOpacity style={styles.contact} onPress={onCall}><MaterialCommunityIcons name="phone" size={18} color="#1557D8" /><Text style={styles.contactText}>778215553</Text></TouchableOpacity></View></View>; }
function isLocalRouterAddress(host: string) { const value = host.trim(); return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(value); }
function formatConnectionError(message: string) { const text = message.toLowerCase(); if (text.includes("timed out") || text.includes("timeout")) return "انتهت مهلة الاتصال. تحقق من IP والمنفذ وتفعيل خدمة API في MikroTik."; if (text.includes("refused")) return "رفض الراوتر الاتصال. فعّل API أو API-SSL وتحقق من قواعد الجدار الناري."; if (text.includes("login") || text.includes("password") || text.includes("unauthorized")) return "بيانات الدخول غير صحيحة أو أن الحساب لا يملك صلاحية API."; if (text.includes("certificate") || text.includes("tls")) return "تعذر إنشاء اتصال آمن. راجع شهادة API-SSL والمنفذ 8729."; return "تعذر الاتصال بالراوتر. راجع البيانات واتصال الشبكة ثم أعد المحاولة."; }

const styles = StyleSheet.create({
  scroll: { paddingTop: 10, paddingBottom: 28 }, hero: { height: 116, borderRadius: 25, overflow: "hidden", padding: 14, flexDirection: "row-reverse", alignItems: "center", gap: 8, shadowColor: "#1645A3", shadowOpacity: 0.24, shadowRadius: 15, elevation: 7 }, heroShine: { position: "absolute", width: 280, height: 180, borderRadius: 160, backgroundColor: "#FFFFFF30", top: -120, left: -55 }, logoBox: { width: 62, height: 62, borderRadius: 20, borderWidth: 2, borderColor: "#FFFFFFA8", backgroundColor: "#082C92", alignItems: "center", justifyContent: "center", shadowColor: "#020D3A", shadowOpacity: 0.4, shadowRadius: 10, elevation: 4 }, brandWrap: { flex: 1, minWidth: 0, alignItems: "flex-start" }, brand: { fontFamily: "CairoExtraBold", fontSize: 19, color: "#FFFFFF", letterSpacing: 0.2 }, brandRed: { color: "#FFDFE3" }, developer: { fontFamily: "CairoExtraBold", fontSize: 8, color: "#E7EFFF", marginTop: 3 }, heroActions: { flexDirection: "row-reverse", alignItems: "center", gap: 5 }, circleAction: { width: 35, height: 35, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#062B7E", shadowOpacity: 0.25, shadowRadius: 7, elevation: 3 }, version: { backgroundColor: "#0B48B3", borderWidth: 1, borderColor: "#FFFFFF88", paddingHorizontal: 6, height: 29, borderRadius: 10, alignItems: "center", justifyContent: "center" }, versionText: { color: "white", fontFamily: "CairoExtraBold", fontSize: 8 }, tabs: { flexDirection: "row-reverse", gap: 10, marginTop: 16 }, activeTab: { flex: 1, height: 54, borderRadius: 16, backgroundColor: "#0E48C9", flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 8, shadowColor: "#1647AD", shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 }, activeTabText: { color: "white", fontFamily: "CairoExtraBold", fontSize: 14 }, tab: { flex: 1, height: 54, borderRadius: 16, borderWidth: 1, borderColor: "#D6E0EE", backgroundColor: "white", flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 8 }, tabText: { color: "#123F95", fontFamily: "CairoExtraBold", fontSize: 13 }, sectionTitle: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-start", gap: 9, marginTop: 20, marginBottom: 9 }, sectionIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: "#EDF2FF", alignItems: "center", justifyContent: "center" }, sectionText: { color: "#123C90", fontSize: 19, fontFamily: "CairoExtraBold" }, methodRow: { flexDirection: "row-reverse", gap: 9, padding: 8, backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: "#DCE5F2" }, methodActive: { flex: 1, height: 60, borderRadius: 15, backgroundColor: "#1558D5", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 }, methodActiveText: { color: "white", fontFamily: "CairoExtraBold", fontSize: 14 }, method: { flex: 1, height: 60, borderRadius: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDE6F2", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 }, methodText: { color: "#143A86", fontFamily: "CairoExtraBold", fontSize: 13 }, networkNotice: { minHeight: 38, backgroundColor: "#EDF5FF", borderWidth: 1, borderColor: "#D6E5FA", borderRadius: 12, marginTop: 8, paddingHorizontal: 10, flexDirection: "row-reverse", alignItems: "center", gap: 7 }, networkNoticeText: { flex: 1, color: "#315C9E", fontFamily: "CairoExtraBold", fontSize: 9, textAlign: "right" }, connectionRow: { flexDirection: "row-reverse", gap: 9, marginTop: 11 }, portField: { width: 94, height: 74, borderRadius: 15, backgroundColor: "white", borderWidth: 1, borderColor: "#D7E0EC", alignItems: "center", paddingTop: 6 }, smallLabel: { fontFamily: "CairoExtraBold", fontSize: 10, color: "#38496A" }, portInput: { color: "#1557D8", fontFamily: "CairoExtraBold", fontSize: 21, textAlign: "center", paddingVertical: 0, height: 30, width: "100%" }, portHint: { color: "#7789A6", fontSize: 8 }, field: { flex: 1, marginTop: 11, gap: 4 }, fieldLabel: { color: "#253F76", fontFamily: "CairoExtraBold", fontSize: 11, textAlign: "right", paddingHorizontal: 6 }, fieldWrap: { height: 57, borderRadius: 15, borderWidth: 1, borderColor: "#D5DFED", backgroundColor: "white", flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, gap: 9, shadowColor: "#274A84", shadowOpacity: 0.04, shadowRadius: 5, elevation: 1 }, fieldInput: { flex: 1, color: "#12387E", fontFamily: "CairoExtraBold", fontSize: 14, textAlign: "right" }, ltr: { textAlign: "left", writingDirection: "ltr" }, primaryActions: { flexDirection: "row-reverse", gap: 8, marginTop: 16 }, loginButton: { flex: 1.3, height: 55, borderRadius: 16, overflow: "hidden", shadowColor: "#D91539", shadowOpacity: 0.23, shadowRadius: 9, elevation: 4 }, loginGradient: { flex: 1, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 8 }, loginText: { color: "white", fontFamily: "CairoExtraBold", fontSize: 14 }, testButton: { flex: 1, height: 55, borderRadius: 16, backgroundColor: "white", borderWidth: 1, borderColor: "#D4DFEF", alignItems: "center", justifyContent: "center", gap: 2 }, accountButton: { width: 76, height: 55, borderRadius: 16, backgroundColor: "white", borderWidth: 1, borderColor: "#D4DFEF", alignItems: "center", justifyContent: "center", gap: 2 }, testText: { color: "#17479F", fontFamily: "CairoExtraBold", fontSize: 9, textAlign: "center" }, option: { minHeight: 61, backgroundColor: "white", borderRadius: 15, borderWidth: 1, borderColor: "#D8E2EF", marginBottom: 9, padding: 9, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, optionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, optionCopy: { flex: 1 }, optionTitle: { color: "#173D86", fontFamily: "CairoExtraBold", fontSize: 12, textAlign: "right" }, optionSubtitle: { color: "#7586A2", fontSize: 8, textAlign: "right", marginTop: 1 }, check: { width: 25, height: 25, borderRadius: 7, backgroundColor: "#E9EFF7", alignItems: "center", justifyContent: "center" }, checkActive: { backgroundColor: "#1659D7" }, advanced: { borderWidth: 1, borderColor: "#C9DCF6", borderRadius: 15, padding: 11, marginBottom: 8, backgroundColor: "#F7FAFF" }, secureToggle: { flexDirection: "row-reverse", gap: 9, alignItems: "center" }, advancedTitle: { color: "#173D86", fontFamily: "CairoExtraBold", fontSize: 12, textAlign: "right" }, advancedHint: { color: "#71829E", fontSize: 9, textAlign: "right", marginTop: 2 }, statusBox: { flexDirection: "row-reverse", gap: 8, alignItems: "center", borderRadius: 14, backgroundColor: "#EFF5FF", borderWidth: 1, borderColor: "#CCDCF4", padding: 11, marginTop: 10 }, statusSuccess: { backgroundColor: "#EAF9F1", borderColor: "#BFE7CF" }, statusError: { backgroundColor: "#FFF0F3", borderColor: "#FFD2DA" }, statusText: { flex: 1, color: "#31517F", fontFamily: "CairoExtraBold", fontSize: 10, textAlign: "right", lineHeight: 17 }, statusTextError: { color: "#BB1B34" }, footer: { alignItems: "center", borderTopWidth: 1, borderTopColor: "#DCE4F0", paddingTop: 15, marginTop: 18 }, supportTitle: { color: "#123F95", fontFamily: "CairoExtraBold", fontSize: 12 }, supportText: { color: "#7586A0", fontSize: 8, textAlign: "center", lineHeight: 15, marginTop: 4, paddingHorizontal: 15 }, contactRow: { flexDirection: "row-reverse", gap: 8, marginTop: 8 }, contact: { flexDirection: "row-reverse", gap: 5, alignItems: "center", backgroundColor: "#F1F6FF", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }, contactText: { color: "#27528E", fontFamily: "CairoExtraBold", fontSize: 9 }
});
