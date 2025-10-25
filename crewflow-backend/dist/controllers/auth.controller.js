"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const authService = new auth_service_1.AuthService();
class AuthController {
    async login(req, res) {
        try {
            const { email, password, deviceId } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' });
            }
            const result = await authService.login(email, password, deviceId);
            return res.json(result);
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Invalid credentials') {
                return res.status(401).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async refresh(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token required' });
            }
            const tokens = await authService.refreshToken(refreshToken);
            return res.json(tokens);
        }
        catch (error) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }
    }
    async logout(req, res) {
        try {
            const { refreshToken } = req.body;
            // Extract sessionId from refresh token and revoke
            await authService.logout(refreshToken);
            return res.json({ message: 'Logged out successfully' });
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map