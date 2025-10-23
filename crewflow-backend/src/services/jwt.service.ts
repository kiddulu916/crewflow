import jwt from 'jsonwebtoken';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface JWTPayload {
  userId: string;
  companyId: string;
  role: string;
  sessionId: string;
}

export class JWTService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry = '15m';
  private refreshTokenExpiry = '7d';

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'dev-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
  }

  generateTokens(userId: string, companyId: string, role: string): { accessToken: string; refreshToken: string; sessionId: string } {
    const sessionId = `session:${userId}:${Date.now()}`;

    const payload: JWTPayload = {
      userId,
      companyId,
      role,
      sessionId
    };

    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry as string
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry as string
    } as jwt.SignOptions);

    // Store refresh token in Redis
    redis.setex(`refresh:${sessionId}`, 7 * 24 * 60 * 60, refreshToken);

    return { accessToken, refreshToken, sessionId };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as JWTPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret) as JWTPayload;

      // Check if refresh token exists in Redis
      const storedToken = await redis.get(`refresh:${payload.sessionId}`);
      if (!storedToken || storedToken !== token) {
        throw new Error('Refresh token not found or invalid');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async revokeRefreshToken(sessionId: string): Promise<void> {
    await redis.del(`refresh:${sessionId}`);
  }
}
