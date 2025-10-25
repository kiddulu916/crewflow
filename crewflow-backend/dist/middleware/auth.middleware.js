"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jwt_service_1 = require("../services/jwt.service");
const jwtService = new jwt_service_1.JWTService();
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const payload = await jwtService.verifyAccessToken(token);
        req.user = payload;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
//# sourceMappingURL=auth.middleware.js.map