import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { CardDesignRow, InsertCardDesign, InsertUser, cardDesigns, telegramSettings, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listCardDesignRows(connectionKey: string) {
  const db = await getDb(); if (!db) return [] as CardDesignRow[];
  return db.select().from(cardDesigns).where(eq(cardDesigns.connectionKey, connectionKey));
}
export async function upsertCardDesignRow(row: InsertCardDesign) {
  const db = await getDb(); if (!db) return false;
  const existing = await db.select().from(cardDesigns).where(and(eq(cardDesigns.connectionKey, row.connectionKey), eq(cardDesigns.designKey, row.designKey))).limit(1);
  if (existing[0]) { await db.update(cardDesigns).set({ name: row.name, category: row.category, payload: row.payload, updatedAt: new Date() }).where(and(eq(cardDesigns.connectionKey, row.connectionKey), eq(cardDesigns.designKey, row.designKey))); }
  else { await db.insert(cardDesigns).values({ connectionKey: row.connectionKey, designKey: row.designKey, name: row.name, category: row.category, payload: row.payload }); }
  return true;
}
export async function deleteCardDesignRow(connectionKey: string, designKey: string) {
  const db = await getDb(); if (!db) return false; await db.delete(cardDesigns).where(and(eq(cardDesigns.connectionKey, connectionKey), eq(cardDesigns.designKey, designKey))); return true;
}
export async function getTelegramSettingsRow(connectionKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(telegramSettings).where(eq(telegramSettings.connectionKey, connectionKey)).limit(1);
  return rows[0];
}
export async function upsertTelegramSettingsRow(connectionKey: string, payload: string) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(telegramSettings).values({ connectionKey, payload }).onDuplicateKeyUpdate({ set: { payload, updatedAt: new Date() } });
  return true;
}
