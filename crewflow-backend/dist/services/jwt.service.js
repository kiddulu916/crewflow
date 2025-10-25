"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
class JWTService {
    accessTokenSecret;
    refreshTokenSecret;
    accessTokenExpiry = '15m';
    refreshTokenExpiry = '7d';
    constructor() {
        this.accessTokenSecret = process.env.JWT_SECRET || 'dev-secret';
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
    }
    generateTokens(userId, companyId, role) {
        const sessionId = `session:${userId}:${Date.now()}`;
        const payload = {
            userId,
            companyId,
            role,
            sessionId
        };
        const accessToken = jsonwebtoken_1.default.sign(payload, this.accessTokenSecret, {
            expiresIn: this.accessTokenExpiry
        });
        const refreshToken = jsonwebtoken_1.default.sign(payload, this.refreshTokenSecret, {
            expiresIn: this.refreshTokenExpiry
        });
        // Store refresh token in Redis
        redis.setex(`refresh:${sessionId}`, 7 * 24 * 60 * 60, refreshToken);
        return { accessToken, refreshToken, sessionId };
    }
    async verifyAccessToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, this.accessTokenSecret);
            return payload;
        }
        catch (error) {
            throw new Error('Invalid or expired access token');
        }
    }
    async verifyRefreshToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, this.refreshTokenSecret);
            // Check if refresh token exists in Redis
            const storedToken = await redis.get(`refresh:${payload.sessionId}`);
            if (!storedToken || storedToken !== token) {
                throw new Error('Refresh token not found or invalid');
            }
            return payload;
        }
        catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }
    async revokeRefreshToken(sessionId) {
        await redis.del(`refresh:${sessionId}`);
    }
}
exports.JWTService = JWTService;
//# sourceMappingURL=jwt.service.js.map