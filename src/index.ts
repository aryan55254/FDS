import "reflect-metadata";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
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
app.use(cookieParser());

// Per-IP Token Bucket Rate Limiter (Redis-backed)
app.use(rateLimiterMiddleware);

// Routes
app.use("/auth", authRoutes);
app.use("/transactions", transactionRoutes);
app.use("/dashboard", dashboardRoutes);

// Health Check
app.get("/", (_req, res) => {
    res.json({ success: true, message: "FDS API is running." });
});

// Boot
const boot = async () => {
    try {
        // Verify Redis connectivity
        await redis.ping();
        console.log("Redis ping successful.");

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
