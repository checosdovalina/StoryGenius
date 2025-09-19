/**
 * Script simple para crear usuario admin en producción
 * Ejecutar: node scripts/create-admin.mjs
 */

import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const adminEmail = 'admin@gbsport.com';
  const adminPassword = 'admin123';
  
  try {
    // Verificar si ya existe
    const existing = await db.select().from(users).where(eq(users.email, adminEmail));
    
    if (existing.length > 0) {
      console.log('❌ Ya existe un usuario con el email:', adminEmail);
      return;
    }

    // Crear usuario admin
    const hashedPassword = await hashPassword(adminPassword);
    
    const admin = await db.insert(users).values({
      username: 'admin',
      email: adminEmail,
      password: hashedPassword,
      name: 'Administrador GBSport',
      role: 'admin',
      club: 'GBSport',
      isActive: true
    }).returning();

    console.log('✅ Usuario admin creado:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Rol: admin');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

main();