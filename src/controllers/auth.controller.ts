/* 
This file contains the controllers for the authentication routes.
*/

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { signToken } from "../utils/jwt";

const userRepo = () => AppDataSource.getRepository(User);

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user already exists by email or username
        const existingUser = await userRepo().findOne({
            where: [{ email }, { username }],
        });

        if (existingUser) {
            const field = existingUser.email === email ? "email" : "username";
            res.status(409).json({
                success: false,
                message: `A user with this ${field} already exists.`,
            });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = userRepo().create({
            username,
            email,
            password: hashedPassword,
            role: role || undefined, // defaults to viewer via entity
        });

        await userRepo().save(user);

        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const user = await userRepo().findOne({ where: { email } });

        if (!user) {
            res.status(401).json({ success: false, message: "Invalid credentials." });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            res.status(401).json({ success: false, message: "Invalid credentials." });
            return;
        }

        const token = signToken({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        res.status(200).json({
            success: true,
            message: "Login successful.",
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });

    res.status(200).json({ success: true, message: "Logged out successfully." });
};
