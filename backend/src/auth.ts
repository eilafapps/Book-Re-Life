
// Fix: Use an alias for the Request type from express to avoid potential global type conflicts.
import { Request as ExpressRequest, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key-that-should-be-in-env';

// Extend Express Request type to include user payload from JWT
export interface AuthenticatedRequest extends ExpressRequest {
    user?: {
        id: string;
        role: Role;
    };
}

export const generateToken = (user: User): string => {
    const payload = { id: user.id, role: user.role };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
};

export const authenticateToken = (requiredRole?: Role) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null) {
            return res.sendStatus(401); // Unauthorized
        }

        jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
            if (err) {
                return res.sendStatus(403); // Forbidden
            }
            req.user = user as { id: string, role: Role };

            // If a specific role is required, check if the user has it
            if (requiredRole && req.user.role !== requiredRole) {
                 // Admins can access everything a staff member can
                if(requiredRole === Role.Staff && req.user.role === Role.Admin) {
                    return next();
                }
                return res.sendStatus(403); // Forbidden
            }

            next();
        });
    };
};
