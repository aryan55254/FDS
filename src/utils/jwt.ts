import jwt, { SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

export interface JwtPayload {
    id: string;
    username: string;
    email: string;
    role: string;
}

export const signToken = (payload: JwtPayload): string => {
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
    return jwt.sign(payload as object, JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
