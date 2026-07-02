import { z } from "zod";
import { UserRole } from "../entities/User";

const nonEmptyString = z.string({ required_error: "This field is required" }).trim();

export const registerSchema = z.object({
    username: nonEmptyString
        .min(3, "Username must be at least 3 characters"),
    email: nonEmptyString
        .email("Invalid email format")
        .transform((value) => value.toLowerCase()),
    password: nonEmptyString
        .min(6, "Password must be at least 6 characters"),
    role: z
        .nativeEnum(UserRole, {
            errorMap: () => ({ message: "Role must be viewer, analyst, or admin" }),
        })
        .optional(),
});

export const loginSchema = z.object({
    email: nonEmptyString
        .email("Invalid email format")
        .transform((value) => value.toLowerCase()),
    password: nonEmptyString
        .min(1, "Password cannot be empty"),
});
