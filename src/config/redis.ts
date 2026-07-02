import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// Use localhost Redis in development by default so local backend talks to dockerized redis.
// If running in production, respect REDIS_URL; in development always use localhost.
const redisUrl = process.env.NODE_ENV === 'production' ? (process.env.REDIS_URL || 'redis://redis:6379') : 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
        const delay = Math.min(times * 200, 1000);
        return delay;
    },
});

redis.on("connect", () => {
    console.log("Redis connected successfully.");
});

redis.on("error", (err) => {
    console.warn("Redis connection warning:", err.message);
});

export const disconnectRedis = async (): Promise<void> => {
    await redis.quit();
    console.log("Redis disconnected.");
};

export default redis;
