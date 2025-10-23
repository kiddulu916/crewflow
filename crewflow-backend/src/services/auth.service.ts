import bcrypt from 'bcrypt';
import prisma from '../lib/db';
import { JWTService } from './jwt.service';

export class AuthService {
  private jwtService: JWTService;

  constructor() {
    this.jwtService = new JWTService();
  }

  async login(email: string, password: string, deviceId?: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true }
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new Error('User account is not active');
    }

    // Generate tokens
    const { accessToken, refreshToken } = this.jwtService.generateTokens(
      user.id,
      user.companyId,
      user.role
    );

    // Update last login
    await prisma.user.update({
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

  async refreshToken(refreshToken: string) {
    const payload = await this.jwtService.verifyRefreshToken(refreshToken);

    // Generate new tokens (rotate refresh token)
    await this.jwtService.revokeRefreshToken(payload.sessionId);
    const tokens = this.jwtService.generateTokens(
      payload.userId,
      payload.companyId,
      payload.role
    );

    return tokens;
  }

  async logout(sessionId: string) {
    await this.jwtService.revokeRefreshToken(sessionId);
  }
}
