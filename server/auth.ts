// Fix: Use an alias for the Request type from express to avoid potential global type conflicts.
import { type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
// Fix: Use a wildcard import for Prisma Client to resolve module resolution errors.
import * as Prisma from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key-that-should-be-in-env';

// Fix: Changed from an interface extending ExpressRequest to a type alias with an intersection.
// This is a more robust way to augment existing types and can prevent issues where properties
// from the base type (like 'headers') are not correctly inherited.
// Fix: Use import('express').Request to avoid global type conflicts.
export type AuthenticatedRequest = import('express').Request & {
    user?: {
        id: string;
        role: Prisma.Role;
    };
};

export const generateToken = (user: Prisma.User): string => {
    const payload = { id: user.id, role: user.role };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
};

export const authenticateToken = (requiredRole?: Prisma.Role) => {
    // Fix: Use import('express').Response to avoid global type conflicts and ensure methods like .sendStatus() are available.
    return (req: AuthenticatedRequest, res: import('express').Response, next: NextFunction) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null) {
            return res.sendStatus(401); // Unauthorized
        }

        jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
            if (err) {
                return res.sendStatus(403); // Forbidden
            }
            req.user = user as { id: string, role: Prisma.Role };

            if (requiredRole && req.user.role !== requiredRole) {
                 if(requiredRole === Prisma.Role.Staff && req.user.role === Prisma.Role.Admin) {
                    return next();
                }
                return res.sendStatus(403); // Forbidden
            }

            next();
        });
    };
};
