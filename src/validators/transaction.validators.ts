import { z } from "zod";

export const depositSchema = z.object({
    amount: z.coerce
        .number({ required_error: "Amount is required", invalid_type_error: "Amount must be a number" })
        .int("Amount must be a whole number")
        .positive("Amount must be a positive number"),
});

export const withdrawSchema = z.object({
    amount: z.coerce
        .number({ required_error: "Amount is required", invalid_type_error: "Amount must be a number" })
        .int("Amount must be a whole number")
        .positive("Amount must be a positive number"),
});

export const amtParamSchema = z.object({
    amt: z.coerce
        .number({ invalid_type_error: "Amount parameter must be a number" })
        .positive("Amount parameter must be positive"),
});
