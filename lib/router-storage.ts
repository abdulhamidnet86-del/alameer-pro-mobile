import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { RouterConnection } from "@/lib/router-context";

export type StoredRouter = RouterConnection & { id: string; name: string };
const STORAGE_KEY = "alameer-pro.saved-routers.v1";

async function readValue() { return Platform.OS === "web" ? AsyncStorage.getItem(STORAGE_KEY) : SecureStore.getItemAsync(STORAGE_KEY); }
async function writeValue(value: string) { if (Platform.OS === "web") await AsyncStorage.setItem(STORAGE_KEY, value); else await SecureStore.setItemAsync(STORAGE_KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }); }
export async function loadSavedRouters(): Promise<StoredRouter[]> { const raw = await readValue(); if (!raw) return []; try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
export async function saveSavedRouters(routers: StoredRouter[]) { await writeValue(JSON.stringify(routers)); }
