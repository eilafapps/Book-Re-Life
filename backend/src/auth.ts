
// Fix: Use direct named imports for Express types to avoid global type conflicts.
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
// Fix: Use named imports for Prisma Client types to resolve module issues.
import { Role, User } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key-that-should-be-in-env';

// Extend Express Request type to include user payload from JWT
// Fix: Use the imported `Request` type for augmentation.
export type AuthenticatedRequest = Request & {
    user?: {
        id: string;
        // Fix: Use the imported `Role` enum.
        role: Role;
    };
};

// Fix: Use the imported `User` type.
export const generateToken = (user: User): string => {
    const payload = { id: user.id, role: user.role };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
};

// Fix: Use the imported `Role` enum.
export const authenticateToken = (requiredRole?: Role) => {
    // Fix: Use the imported `Response` and `NextFunction` types.
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
            // Fix: Use the imported `Role` enum.
            req.user = user as { id: string, role: Role };

            // If a specific role is required, check if the user has it
            if (requiredRole && req.user.role !== requiredRole) {
                 // Admins can access everything a staff member can
                // Fix: Use the imported `Role` enum.
                if(requiredRole === Role.Staff && req.user.role === Role.Admin) {
                    return next();
                }
                return res.sendStatus(403); // Forbidden
            }

            next();
        });
    };
};
