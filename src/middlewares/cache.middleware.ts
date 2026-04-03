import { Request, Response, NextFunction } from "express";
import redis from "../config/redis";

const KEY_PREFIX = "cache:";

/**
 * Express middleware that caches JSON responses in Redis.
 * @param ttlSeconds – time-to-live for the cached entry (default 30s)
 */
export const cacheMiddleware = (ttlSeconds: number = 30) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const key = `${KEY_PREFIX}${req.originalUrl}`;

        try {
            const cached = await redis.get(key);

            if (cached) {
                res.setHeader("X-Cache", "HIT");
                res.status(200).json(JSON.parse(cached));
                return;
            }
        } catch (error) {
            console.error("Cache read error:", error);
        }

        // Monkey-patch res.json to intercept the response body
        const originalJson = res.json.bind(res);
        res.json = ((body: any) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                redis
                    .set(key, JSON.stringify(body), "EX", ttlSeconds)
                    .catch((err) => console.error("Cache write error:", err));
            }

            res.setHeader("X-Cache", "MISS");
            return originalJson(body);
        }) as any;

        next();
    };
};

/**
 * Invalidate cache entries matching the given patterns.
 * Uses SCAN to avoid blocking Redis.
 */
export const invalidateCache = async (...patterns: string[]): Promise<void> => {
    try {
        for (const pattern of patterns) {
            let cursor = "0";
            do {
                const [nextCursor, keys] = await redis.scan(
                    cursor,
                    "MATCH",
                    pattern,
                    "COUNT",
                    100
                );
                cursor = nextCursor;

                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            } while (cursor !== "0");
        }
    } catch (error) {
        console.error("Cache invalidation error:", error);
    }
};
