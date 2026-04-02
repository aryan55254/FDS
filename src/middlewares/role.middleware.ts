import { Request, Response, NextFunction } from "express";

/**
 * Role-based access control middleware.
 * Returns 403 if the authenticated user's role is not in the allowed list.
 */
export const authorize = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Authentication required." });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: `Access denied. Required role(s): ${allowedRoles.join(", ")}`,
            });
            return;
        }

        next();
    };
};
