import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { users } from "@shared/schema";
import { eq } from 'drizzle-orm';

async function updateAdminEmail() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const db = drizzle({ client: pool });

    const [user] = await db
      .update(users)
      .set({ email: 'admin@gbsports.com', role: 'superadmin' })
      .where(eq(users.username, 'admin'))
      .returning();

    console.log("✅ Admin actualizado:");
    console.log(`   Email: ${user.email}`);
    console.log(`   Usuario: ${user.username}`);
    console.log(`   Rol: ${user.role}`);
    
    await pool.end();
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
  process.exit(0);
}

updateAdminEmail();
