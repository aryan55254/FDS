import "reflect-metadata";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { AppDataSource } from "./config/data-source";
import redis, { disconnectRedis } from "./config/redis";
import { rateLimiterMiddleware } from "./middlewares/rateLimiter.middleware";
import authRoutes from "./routes/auth.routes";
import transactionRoutes from "./routes/transaction.routes";
import dashboardRoutes from "./routes/dashboard.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Global Middleware
app.use(cors({
    origin: true,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Per-IP Token Bucket Rate Limiter (Redis-backed)
app.use(rateLimiterMiddleware);

// NOTE: Frontend is served separately; backend provides API only.

// Versioned API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

// Legacy routes retained for compatibility
app.use("/auth", authRoutes);
app.use("/transactions", transactionRoutes);
app.use("/dashboard", dashboardRoutes);

// Removed SPA catch-all. Non-API requests will return 404 by default.

// Health Check
app.get("/health", (_req, res) => {
    res.json({ success: true, message: "FDS API is running." });
});

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Route not found." });
});

// Error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
});

// Boot
const boot = async () => {
    try {
        // Verify Redis connectivity but continue if unavailable
        try {
            await redis.ping();
            console.log("Redis ping successful.");
        } catch {
            console.warn("Redis unavailable; continuing without cache.");
        }

        await AppDataSource.initialize();
        console.log("Database connected successfully.");

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Boot failed:", error);
        process.exit(1);
    }
};

boot();

// Graceful shutdown
const shutdown = async () => {
    console.log("\nShutting down gracefully...");
    await disconnectRedis();
    await AppDataSource.destroy();
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
