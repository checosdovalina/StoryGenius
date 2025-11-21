import { db } from "../server/db";
import { users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function createSuperAdmin() {
  try {
    const password = "admin123456";
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    const hashedPassword = `${buf.toString("hex")}.${salt}`;

    const [user] = await db
      .insert(users)
      .values({
        name: "Admin",
        username: "admin",
        email: "admin@example.com",
        password: hashedPassword,
        role: "superadmin",
        preferredSport: "racquetball",
        isActive: true,
      })
      .returning();

    console.log("✅ SuperAdmin creado:");
    console.log(`   Email: ${user.email}`);
    console.log(`   Usuario: ${user.username}`);
    console.log(`   Contraseña: ${password}`);
    console.log(`   Rol: ${user.role}`);
  } catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      console.log("❌ El usuario admin ya existe");
    } else {
      console.error("❌ Error creando superadmin:", error);
    }
    process.exit(1);
  }
  process.exit(0);
}

createSuperAdmin();
