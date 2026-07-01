import {
  CONFIG_DEFAULTS,
  CONFIG_KEYS,
  type AppConfigRecord,
  type ConfigKey,
  type ConfigScope,
  type ConfigValueMap,
} from "../config-types";
import { COLLECTIONS, LEGACY_SYSTEM_SETTING_KEYS } from "./collections";
import { getMongoDb } from "./client";

type AppConfigDoc = {
  _id: ConfigKey;
  scope: ConfigScope;
  schemaVersion: number;
  value: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
};

async function configCollection() {
  const db = await getMongoDb();
  return db.collection<AppConfigDoc>(COLLECTIONS.appConfig);
}

function toRecord<K extends ConfigKey>(doc: AppConfigDoc | null, key: K): AppConfigRecord<ConfigValueMap[K]> {
  const defaults = CONFIG_DEFAULTS[key];
  return {
    key,
    scope: doc?.scope ?? defaults.scope,
    schemaVersion: doc?.schemaVersion ?? defaults.schemaVersion,
    value: (doc?.value as ConfigValueMap[K] | undefined) ?? defaults.value,
    createdAt: doc?.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export function normalizeLegacyAppConfigDoc(doc: Record<string, unknown> | null, key: ConfigKey): AppConfigDoc | null {
  if (!doc) return null;

  if (doc.value && typeof doc.value === "object") {
    return doc as AppConfigDoc;
  }

  if (key === "admin.ip_allowlist" && typeof doc.enabled === "boolean") {
    return {
      _id: key,
      scope: "admin",
      schemaVersion: 1,
      value: {
        enabled: doc.enabled,
        ips: Array.isArray(doc.ips) ? doc.ips : [],
      },
      createdAt:
        doc.createdAt instanceof Date
          ? doc.createdAt
          : doc.updatedAt instanceof Date
            ? doc.updatedAt
            : new Date(),
      updatedAt:
        doc.updatedAt instanceof Date
          ? doc.updatedAt
          : doc.createdAt instanceof Date
            ? doc.createdAt
            : new Date(),
      updatedBy: typeof doc.updatedBy === "string" ? doc.updatedBy : null,
    };
  }

  return null;
}

type LegacyIpAllowlistDoc = {
  _id: string;
  enabled?: boolean;
  ips?: string[];
  updatedAt?: Date;
  updatedBy?: string | null;
};

async function migrateLegacySystemSettings(): Promise<void> {
  const db = await getMongoDb();
  const legacy = await db
    .collection<LegacyIpAllowlistDoc>(COLLECTIONS.systemSettings)
    .findOne({ _id: LEGACY_SYSTEM_SETTING_KEYS.ipAllowlist });
  if (!legacy || typeof legacy.enabled !== "boolean") return;

  const coll = await configCollection();
  const existing = await coll.findOne({ _id: CONFIG_KEYS.adminIpAllowlist });
  if (existing) return;

  const now = new Date();
  const defaults = CONFIG_DEFAULTS[CONFIG_KEYS.adminIpAllowlist];
  await coll.updateOne(
    { _id: CONFIG_KEYS.adminIpAllowlist },
    {
      $setOnInsert: {
        _id: CONFIG_KEYS.adminIpAllowlist,
        scope: defaults.scope,
        schemaVersion: defaults.schemaVersion,
        createdAt: legacy.updatedAt ?? now,
      },
      $set: {
        value: {
          enabled: legacy.enabled,
          ips: Array.isArray(legacy.ips) ? legacy.ips : [],
        },
        updatedAt: legacy.updatedAt ?? now,
        updatedBy: legacy.updatedBy ?? null,
      },
    },
    { upsert: true },
  );
}

export async function ensureAppConfigBootstrap(): Promise<void> {
  const coll = await configCollection();
  await coll.createIndex({ scope: 1 });

  await migrateLegacySystemSettings();

  const now = new Date();
  for (const key of Object.keys(CONFIG_DEFAULTS) as ConfigKey[]) {
    const defaults = CONFIG_DEFAULTS[key];
    await coll.updateOne(
      { _id: key },
      {
        $setOnInsert: {
          _id: key,
          scope: defaults.scope,
          schemaVersion: defaults.schemaVersion,
          value: defaults.value,
          createdAt: now,
          updatedAt: now,
          updatedBy: null,
        },
      },
      { upsert: true },
    );
  }
}

export async function getAppConfig<K extends ConfigKey>(key: K): Promise<AppConfigRecord<ConfigValueMap[K]>> {
  const coll = await configCollection();
  const raw = await coll.findOne({ _id: key });
  const doc = normalizeLegacyAppConfigDoc(raw as Record<string, unknown> | null, key) ?? raw;
  return toRecord(doc, key);
}

export async function setAppConfig<K extends ConfigKey>(
  key: K,
  value: ConfigValueMap[K],
  input: { updatedBy: string },
): Promise<AppConfigRecord<ConfigValueMap[K]>> {
  const defaults = CONFIG_DEFAULTS[key];
  const now = new Date();
  const doc: AppConfigDoc = {
    _id: key,
    scope: defaults.scope,
    schemaVersion: defaults.schemaVersion,
    value: value as Record<string, unknown>,
    createdAt: now,
    updatedAt: now,
    updatedBy: input.updatedBy,
  };

  await (await configCollection()).updateOne(
    { _id: key },
    {
      $set: {
        scope: doc.scope,
        schemaVersion: doc.schemaVersion,
        value: doc.value,
        updatedAt: doc.updatedAt,
        updatedBy: doc.updatedBy,
      },
      $setOnInsert: {
        createdAt: doc.createdAt,
      },
    },
    { upsert: true },
  );

  return toRecord(doc, key);
}