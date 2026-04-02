import { z } from "zod";
import { UserRole } from "../entities/User";

export const registerSchema = z.object({
    username: z
        .string({ required_error: "Username is required" })
        .min(3, "Username must be at least 3 characters"),
    email: z
        .string({ required_error: "Email is required" })
        .email("Invalid email format"),
    password: z
        .string({ required_error: "Password is required" })
        .min(6, "Password must be at least 6 characters"),
    role: z
        .nativeEnum(UserRole, {
            errorMap: () => ({ message: "Role must be viewer, analyst, or admin" }),
        })
        .optional(),
});

export const loginSchema = z.object({
    email: z
        .string({ required_error: "Email is required" })
        .email("Invalid email format"),
    password: z
        .string({ required_error: "Password is required" })
        .min(1, "Password cannot be empty"),
});
