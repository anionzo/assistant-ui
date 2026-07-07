import { ensureAppConfigBootstrap } from "./config-store";
import { COLLECTIONS } from "./collections";
import { getMongoDb } from "./client";
import { buildRolePermissionPairs, SEED_PERMISSIONS, SEED_ROLES } from "./seed-data";

type RoleSeedDoc = {
  _id: number;
  name: string;
  description: string;
  createdAt: Date;
};

type PermissionSeedDoc = {
  _id: number;
  code: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: Date;
};

async function ensureRbacPatches(db: Awaited<ReturnType<typeof getMongoDb>>): Promise<void> {
  const roles = db.collection<RoleSeedDoc>(COLLECTIONS.roles);
  const permissions = db.collection<PermissionSeedDoc>(COLLECTIONS.permissions);

  for (const role of SEED_ROLES) {
    await roles.updateOne(
      { _id: role._id },
      { $setOnInsert: { ...role } },
      { upsert: true },
    );
  }

  for (const permission of SEED_PERMISSIONS) {
    await permissions.updateOne(
      { _id: permission._id },
      { $setOnInsert: { ...permission } },
      { upsert: true },
    );
  }

  for (const pair of buildRolePermissionPairs()) {
    await db.collection(COLLECTIONS.rolePermissions).updateOne(
      { roleId: pair.roleId, permissionId: pair.permissionId },
      { $setOnInsert: pair },
      { upsert: true },
    );
  }
}

export async function ensureMongoBootstrap(): Promise<void> {
  const db = await getMongoDb();

  await Promise.all([
    db.collection(COLLECTIONS.users).createIndex({ email: 1 }, { unique: true }),
    db.collection(COLLECTIONS.oauthAccounts).createIndex({ provider: 1, providerAccountId: 1 }, { unique: true }),
    db.collection(COLLECTIONS.oauthAccounts).createIndex({ userId: 1 }),
    db.collection(COLLECTIONS.refreshTokens).createIndex({ tokenHash: 1 }),
    db.collection(COLLECTIONS.refreshTokens).createIndex({ userId: 1 }),
    db.collection(COLLECTIONS.refreshTokens).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection(COLLECTIONS.passwordResetTokens).createIndex({ tokenHash: 1 }),
    db.collection(COLLECTIONS.passwordResetTokens).createIndex({ userId: 1 }),
    db.collection(COLLECTIONS.chatThreads).createIndex({ userId: 1, updatedAt: -1 }),
    db.collection(COLLECTIONS.chatThreads).createIndex({ userId: 1, conversationId: 1 }, { unique: true }),
    db.collection(COLLECTIONS.voiceFormSessions).createIndex({ userId: 1, tenantId: 1, updatedAt: -1 }),
    db.collection(COLLECTIONS.voiceFormSessions).createIndex({ userId: 1, threadId: 1, updatedAt: -1 }),
    db.collection(COLLECTIONS.roles).createIndex({ name: 1 }, { unique: true }),
    db.collection(COLLECTIONS.permissions).createIndex({ code: 1 }, { unique: true }),
    db.collection(COLLECTIONS.rolePermissions).createIndex({ roleId: 1, permissionId: 1 }, { unique: true }),
    db.collection(COLLECTIONS.userRoles).createIndex({ userId: 1, roleId: 1 }, { unique: true }),
    db.collection(COLLECTIONS.userRoles).createIndex({ userId: 1 }),
  ]);

  const rolesCount = await db.collection(COLLECTIONS.roles).countDocuments();
  if (rolesCount === 0) {
    await db.collection<RoleSeedDoc>(COLLECTIONS.roles).insertMany(
      SEED_ROLES.map((role) => ({ ...role })) as RoleSeedDoc[],
    );
    await db.collection<PermissionSeedDoc>(COLLECTIONS.permissions).insertMany(
      SEED_PERMISSIONS.map((permission) => ({ ...permission })) as PermissionSeedDoc[],
    );
    await db.collection(COLLECTIONS.rolePermissions).insertMany(buildRolePermissionPairs());
    console.info("[bootstrap] RBAC seed applied");
  } else {
    await ensureRbacPatches(db);
  }

  await ensureAppConfigBootstrap();

  console.info("[bootstrap] MongoDB indexes, seed, and app_config ready");
}