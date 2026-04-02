import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/*
Generic validation middleware factory.
*/
export const validate =
    (schema: ZodSchema, source: "body" | "params" = "body") =>
        (req: Request, res: Response, next: NextFunction): void => {
            try {
                const parsed = schema.parse(req[source]);
                // Replace the source with the parsed (coerced/transformed) data
                (req as any)[source] = parsed;
                next();
            } catch (error) {
                if (error instanceof ZodError) {
                    const errors = error.errors.map((e) => ({
                        field: e.path.join("."),
                        message: e.message,
                    }));
                    res.status(400).json({
                        success: false,
                        message: "Validation failed",
                        errors,
                    });
                    return;
                }
                next(error);
            }
        };
