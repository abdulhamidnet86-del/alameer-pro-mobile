import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";

const stages = [
  { title: "جارٍ التنفيذ...", detail: "تجهيز بيئة الإدارة", icon: "lightning-bolt-outline" as const },
  { title: "تسجيل الدخول...", detail: "تهيئة جلسة المستخدم", icon: "login" as const },
  { title: "الاتصال...", detail: "انتظار بيانات الراوتر", icon: "connection" as const },
];

export default function SplashScreen() {
  const [stageIndex, setStageIndex] = useState(0);
  const stage = useMemo(() => stages[stageIndex], [stageIndex]);

  useEffect(() => {
    const first = setTimeout(() => setStageIndex(1), 950);
    const second = setTimeout(() => setStageIndex(2), 1900);
    const finish = setTimeout(() => router.replace("/connect" as any), 2850);
    return () => { clearTimeout(first); clearTimeout(second); clearTimeout(finish); };
  }, []);

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-[#050D22]" className="px-5">
      <Animated.View entering={FadeIn.duration(420)} style={styles.shell}>
        <View style={styles.version}><Text style={styles.versionText}>v1.0.34</Text></View>
        <Animated.View key={stage.title} entering={FadeIn.duration(180)} style={styles.status}>
          <MaterialCommunityIcons name={stage.icon} size={22} color="#77C8FF" />
          <Text style={styles.statusText}>{stage.title}</Text>
        </Animated.View>
        <Animated.View entering={ZoomIn.duration(480)} style={styles.hero}>
          <View style={styles.orb}>
            <MaterialCommunityIcons name="router-wireless" size={74} color="white" />
            <View style={styles.bolt}><MaterialCommunityIcons name="lightning-bolt" size={22} color="white" /></View>
          </View>
          <Text style={styles.logo}>ALAMEER <Text style={styles.logoRed}>PRO</Text></Text>
          <Text style={styles.arabic}>الأمير برو</Text>
          <Text style={styles.tagline}>إدارة الراوترات والبيانات والكروت من مكان واحد</Text>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(180).duration(360)} style={styles.loading}>
          <View style={styles.loadingHeader}><Text style={styles.loadingTitle}>{stage.title}</Text><MaterialCommunityIcons name={stage.icon} size={28} color="#56B5FF" /></View>
          <Text style={styles.loadingSub}>{stage.detail}</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${36 + stageIndex * 32}%` }]} /></View>
          <View style={styles.steps}>{stages.map((item, index) => <View key={item.title} style={styles.step}><View style={[styles.stepDot, index <= stageIndex && styles.stepDotActive]} /><Text style={[styles.stepText, index === stageIndex && styles.stepTextActive]}>{item.title.replace("...", "")}</Text></View>)}</View>
        </Animated.View>
        <View style={styles.footer}><Text style={styles.footerText}>إدارة User Manager وHotspot بأمان</Text><Text style={styles.copy}>المهندس والمبرمج عبدالحميد داوؤد · 778215553</Text><Text style={styles.copy}>© 2026 ALAMEER PRO</Text></View>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ shell: { flex: 1, borderWidth: 1, borderColor: "#184681", borderRadius: 34, padding: 18, justifyContent: "space-between", overflow: "hidden" }, version: { alignSelf: "flex-start", borderRadius: 18, borderWidth: 1, borderColor: "#76233A", backgroundColor: "#301226", paddingHorizontal: 16, paddingVertical: 8 }, versionText: { color: "white", fontFamily: "CairoExtraBold", fontWeight: "800" }, status: { position: "absolute", top: 18, right: 18, borderRadius: 18, borderWidth: 1, borderColor: "#2D67B6", backgroundColor: "#102A5A", paddingHorizontal: 13, paddingVertical: 8, flexDirection: "row-reverse", gap: 5, alignItems: "center" }, statusText: { color: "white", fontFamily: "CairoExtraBold", fontWeight: "700" }, hero: { alignItems: "center", marginTop: 50 }, orb: { width: 190, height: 190, borderRadius: 100, backgroundColor: "#0C2F86", borderWidth: 4, borderColor: "#2BA9FF", alignItems: "center", justifyContent: "center", shadowColor: "#1B9EFF", shadowOpacity: 0.7, shadowRadius: 25, elevation: 12 }, bolt: { position: "absolute", bottom: 21, right: 18, width: 47, height: 47, borderRadius: 25, backgroundColor: "#DD1E3B", alignItems: "center", justifyContent: "center" }, logo: { color: "white", fontSize: 39, fontFamily: "CairoExtraBold", fontWeight: "900", marginTop: 28, letterSpacing: 1 }, logoRed: { color: "#E5223C" }, arabic: { color: "white", fontSize: 27, fontFamily: "CairoExtraBold", fontWeight: "700", marginTop: 5 }, tagline: { color: "#AEBBD2", fontSize: 14, marginTop: 8, textAlign: "center" }, loading: { borderRadius: 20, borderWidth: 1, borderColor: "#274B83", padding: 16, backgroundColor: "#081633" }, loadingHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 }, loadingTitle: { color: "white", fontSize: 20, fontFamily: "CairoExtraBold", fontWeight: "800" }, loadingSub: { color: "#A8B5CC", fontSize: 12, marginTop: 4, textAlign: "center" }, track: { width: "100%", height: 8, borderRadius: 5, backgroundColor: "#1C2B4B", marginTop: 15, overflow: "hidden" }, fill: { height: "100%", backgroundColor: "#1AA7FF", borderRadius: 5 }, steps: { flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 13 }, step: { alignItems: "center", gap: 4 }, stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#29446F" }, stepDotActive: { backgroundColor: "#39B0FF" }, stepText: { color: "#7185AA", fontSize: 9 }, stepTextActive: { color: "white", fontFamily: "CairoExtraBold", fontWeight: "700" }, footer: { borderTopWidth: 1, borderTopColor: "#1C345D", paddingTop: 14, alignItems: "center" }, footerText: { color: "#A7B5CD", fontSize: 12 }, copy: { color: "#627594", fontSize: 11, marginTop: 5 } });
