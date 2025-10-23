import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';

const jwtService = new JWTService();

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    companyId: string;
    role: string;
    sessionId: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = await jwtService.verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
