#!/usr/bin/env node

/**
 * Script para crear un usuario administrador en la base de datos de producción
 * 
 * USO:
 * 1. Desde tu terminal en el deployment, ejecuta:
 *    node scripts/create-admin-user.js
 * 
 * 2. O usa las variables de entorno:
 *    ADMIN_EMAIL=admin@tudominio.com ADMIN_PASSWORD=tupassword node scripts/create-admin-user.js
 */

import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdminUser() {
  // Importar dinámicamente para evitar problemas de ESM
  const { db } = await import('../server/db.js');
  const { users } = await import('../shared/schema.js');
  const { eq } = await import('drizzle-orm');
  
  // Configuración del usuario admin
  const adminData = {
    username: process.env.ADMIN_USERNAME || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@gbsport.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    name: process.env.ADMIN_NAME || 'Administrador',
    role: 'admin',
    club: 'GBSport Admin',
    isActive: true
  };

  try {
    console.log('🔍 Verificando si el usuario admin ya existe...');
    
    // Verificar si ya existe un usuario admin con este email
    const existingUser = await db.select().from(users).where(eq(users.email, adminData.email));
    
    if (existingUser.length > 0) {
      console.log('⚠️  Ya existe un usuario con el email:', adminData.email);
      console.log('💡 Si necesitas cambiar la contraseña, usa el formulario de la aplicación web');
      return;
    }

    console.log('🔐 Generando hash de contraseña...');
    const hashedPassword = await hashPassword(adminData.password);

    console.log('💾 Creando usuario admin en la base de datos...');
    const newAdmin = await db
      .insert(users)
      .values({
        ...adminData,
        password: hashedPassword
      })
      .returning();

    console.log('✅ Usuario admin creado exitosamente:');
    console.log('📧 Email:', adminData.email);
    console.log('👤 Usuario:', adminData.username);
    console.log('🔑 Contraseña:', adminData.password);
    console.log('🏷️  Rol: admin');
    console.log('');
    console.log('🚀 Puedes hacer login ahora con estas credenciales en tu aplicación deployada');
    
  } catch (error) {
    console.error('❌ Error creando usuario admin:', error.message);
    process.exit(1);
  }
}

createAdminUser();