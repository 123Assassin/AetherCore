import type { Database } from '@package/db';
import { users } from '@package/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

const WEB_USER_SEED_COUNT = 20;
const DEFAULT_WEB_USER_PASSWORD = 'teacher123';

type UserSeedConfig = {
  email: string;
  password: string;
  user: string;
};

export function getAdminSeedConfig() {
  const user = process.env.ADMIN_USER || 'admin';

  return {
    email: process.env.ADMIN_EMAIL || `${user}@aethercore.local`,
    password: process.env.ADMIN_PASSWORD || 'admin@123',
    user,
  };
}

export function getWebUserSeedConfig() {
  const user = process.env.WEB_USER || 'teacher';

  return {
    email: process.env.WEB_USER_EMAIL || `${user}@aethercore.local`,
    password: process.env.WEB_USER_PASSWORD || DEFAULT_WEB_USER_PASSWORD,
    user,
  };
}

export function getWebUserSeedConfigs(): UserSeedConfig[] {
  const primaryUser = getWebUserSeedConfig();
  const password = primaryUser.password;
  const secondaryUsers = Array.from({ length: WEB_USER_SEED_COUNT - 1 }, (_, index) => {
    const sequence = String(index + 1).padStart(2, '0');
    const user = `teacher${sequence}`;

    return {
      email: `${user}@aethercore.local`,
      password,
      user,
    };
  });

  return [primaryUser, ...secondaryUsers];
}

export async function seedAdmin(db: Database) {
  const { email: adminEmail, password: adminPassword, user: adminUser } = getAdminSeedConfig();

  const [existingByUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, adminUser))
    .limit(1);
  const [legacyByEmail] = existingByUser
    ? []
    : await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  const existing = existingByUser ?? legacyByEmail;

  if (existing) {
    if (existing.role === 'admin' && existing.username !== adminUser) {
      await db
        .update(users)
        .set({ username: adminUser, updatedAt: new Date() })
        .where(eq(users.id, existing.id));
    }

    console.log(`Admin user already exists: ${adminUser}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  await db.insert(users).values({
    email: adminEmail,
    name: 'System Admin',
    password: hashedPassword,
    role: 'admin',
    isActive: true,
    username: adminUser,
  });

  console.log(`Admin user created: ${adminUser}`);
}

async function seedOneWebUser(db: Database, { email, password, user }: UserSeedConfig) {
  const [existingByUser] = await db.select().from(users).where(eq(users.username, user)).limit(1);
  const [legacyByEmail] = existingByUser
    ? []
    : await db.select().from(users).where(eq(users.email, email)).limit(1);
  const existing = existingByUser ?? legacyByEmail;

  if (existing) {
    if (existing.role === 'user' && existing.username !== user) {
      await db
        .update(users)
        .set({ username: user, updatedAt: new Date() })
        .where(eq(users.id, existing.id));
    }

    console.log(`Web user already exists: ${user}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    email,
    name: 'Teacher User',
    password: hashedPassword,
    role: 'user',
    isActive: true,
    username: user,
  });

  console.log(`Web user created: ${user}`);
}

export async function seedWebUsers(db: Database) {
  for (const config of getWebUserSeedConfigs()) {
    await seedOneWebUser(db, config);
  }
}

export const seedWebUser = seedWebUsers;
