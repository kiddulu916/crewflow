import { Response } from 'express';
import { UserService } from '../services/user.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole, UserStatus } from '@prisma/client';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

const userService = new UserService();

export class UserController {
  async createUser(req: AuthRequest, res: Response) {
    try {
      const { email, name, role, phoneNumber, password } = req.body;

      if (!email || !name || !role) {
        return res.status(400).json({ error: 'Email, name, and role are required' });
      }

      const user = await userService.createUser({
        companyId: req.user!.companyId,
        email,
        name,
        role: role as UserRole,
        phoneNumber,
        password
      });

      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof ConflictError) {
        return res.status(409).json({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id, req.user!.companyId);
      return res.json(user);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listUsers(req: AuthRequest, res: Response) {
    try {
      const { role, status, search } = req.query;

      const users = await userService.listUsers(req.user!.companyId, {
        role: role as UserRole | undefined,
        status: status as UserStatus | undefined,
        search: search as string | undefined
      });

      return res.json(users);
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, phoneNumber, role, status } = req.body;

      const user = await userService.updateUser(id, req.user!.companyId, {
        name,
        phoneNumber,
        role: role as UserRole | undefined,
        status: status as UserStatus | undefined
      });

      return res.json(user);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await userService.deleteUser(id, req.user!.companyId);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
