"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("../services/user.service");
const errors_1 = require("../utils/errors");
const userService = new user_service_1.UserService();
class UserController {
    async createUser(req, res) {
        try {
            const { email, name, role, phoneNumber, password } = req.body;
            if (!email || !name || !role) {
                return res.status(400).json({ error: 'Email, name, and role are required' });
            }
            const user = await userService.createUser({
                companyId: req.user.companyId,
                email,
                name,
                role: role,
                phoneNumber,
                password
            });
            return res.status(201).json(user);
        }
        catch (error) {
            if (error instanceof errors_1.ConflictError) {
                return res.status(409).json({ error: error.message });
            }
            if (error instanceof errors_1.ValidationError) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getUser(req, res) {
        try {
            const { id } = req.params;
            const user = await userService.getUserById(id, req.user.companyId);
            return res.json(user);
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async listUsers(req, res) {
        try {
            const { role, status, search } = req.query;
            const users = await userService.listUsers(req.user.companyId, {
                role: role,
                status: status,
                search: search
            });
            return res.json(users);
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, phoneNumber, role, status } = req.body;
            const user = await userService.updateUser(id, req.user.companyId, {
                name,
                phoneNumber,
                role: role,
                status: status
            });
            return res.json(user);
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            await userService.deleteUser(id, req.user.companyId);
            return res.status(204).send();
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map