import type { Database } from '@package/db';
import { users } from '@package/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export async function seedAdmin(db: Database) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';

  const [existing] = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);

  if (existing) {
    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  await db.insert(users).values({
    email: adminEmail,
    name: 'System Admin',
    password: hashedPassword,
    role: 'admin',
    isActive: true,
  });

  console.log(`Admin user created: ${adminEmail}`);
}
