import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import ws from "ws";

const scryptAsync = promisify(scrypt);

async function createSuperAdmin() {
  try {
    const pool = new Pool({
      connectionString: "postgresql://neondb_owner:npg_Y9tzdDnglCr7@ep-tiny-recipe-aegd6gpp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    });

    const db = drizzle({ client: pool });

    const password = "admin123456";
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    const hashedPassword = `${buf.toString("hex")}.${salt}`;

    const [user] = await db
      .insert(users)
      .values({
        name: "Admin GB Sports",
        username: "admin",
        email: "admin@gbsports.com",
        password: hashedPassword,
        role: "superadmin",
        preferredSport: "racquetball",
        isActive: true,
      })
      .returning();

    console.log("✅ SuperAdmin creado en Neon:");
    console.log(`   Email: ${user.email}`);
    console.log(`   Usuario: ${user.username}`);
    console.log(`   Contraseña: ${password}`);
    console.log(`   Rol: ${user.role}`);
    
    await pool.end();
  } catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      console.log("✅ El usuario admin ya existe en Neon");
    } else {
      console.error("❌ Error:", error.message);
    }
    process.exit(1);
  }
  process.exit(0);
}

createSuperAdmin();
