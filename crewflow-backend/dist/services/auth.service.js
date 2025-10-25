"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = __importDefault(require("../lib/db"));
const jwt_service_1 = require("./jwt.service");
class AuthService {
    jwtService;
    constructor() {
        this.jwtService = new jwt_service_1.JWTService();
    }
    async login(email, password, deviceId) {
        // Find user
        const user = await db_1.default.user.findUnique({
            where: { email },
            include: { company: true }
        });
        if (!user || !user.passwordHash) {
            throw new Error('Invalid credentials');
        }
        // Verify password
        const isValidPassword = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }
        // Check if user is active
        if (user.status !== 'ACTIVE') {
            throw new Error('User account is not active');
        }
        // Generate tokens
        const { accessToken, refreshToken } = this.jwtService.generateTokens(user.id, user.companyId, user.role);
        // Update last login
        await db_1.default.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });
        // Return tokens and user (excluding password)
        const { passwordHash, ...userWithoutPassword } = user;
        return {
            accessToken,
            refreshToken,
            user: userWithoutPassword
        };
    }
    async refreshToken(refreshToken) {
        const payload = await this.jwtService.verifyRefreshToken(refreshToken);
        // Generate new tokens (rotate refresh token)
        await this.jwtService.revokeRefreshToken(payload.sessionId);
        const tokens = this.jwtService.generateTokens(payload.userId, payload.companyId, payload.role);
        return tokens;
    }
    async logout(sessionId) {
        await this.jwtService.revokeRefreshToken(sessionId);
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map