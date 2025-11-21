import { Express } from 'express';
import { storage } from './storage';

export function setupAdminEndpoint(app: Express) {
  app.post('/api/setup/create-superadmin', async (req, res) => {
    try {
      const { email, username, password, name } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const user = await storage.createUser({
        username,
        email,
        password,
        name,
      });

      // Update to superadmin
      const superAdmin = await storage.updateUserRole(user.id, 'superadmin');
      const { password: _, ...safeUser } = superAdmin;
      
      res.status(201).json(safeUser);
    } catch (error) {
      console.error('Error creating superadmin:', error);
      res.status(500).json({ error: 'Failed to create superadmin' });
    }
  });
}
