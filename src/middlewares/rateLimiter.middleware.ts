import { Request, Response, NextFunction } from "express";
import redis from "../config/redis";

/**
 * Redis-based Token Bucket Rate Limiter (per IP).
 *
 * Uses an atomic Lua script to avoid race conditions.
 * Each IP gets a bucket with `capacity` tokens that refills
 * at `refillRate` tokens per `windowSeconds`.
 */

const BUCKET_CAPACITY = 20;
const REFILL_RATE = 20;          // tokens added per window
const WINDOW_SECONDS = 60;       // refill window
const KEY_PREFIX = "rl:";

// Lua script: atomic token bucket check-and-decrement
const LUA_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local windowSeconds = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
    -- First request: initialise a full bucket
    tokens = capacity
    lastRefill = now
end

-- Calculate tokens to add based on elapsed time
local elapsed = now - lastRefill
local tokensToAdd = math.floor(elapsed * refillRate / windowSeconds)

if tokensToAdd > 0 then
    tokens = math.min(capacity, tokens + tokensToAdd)
    lastRefill = now
end

if tokens <= 0 then
    -- No tokens left: return 0 remaining, and seconds until next refill
    local retryAfter = math.ceil(windowSeconds / refillRate)
    return { 0, retryAfter }
end

-- Consume one token
tokens = tokens - 1
redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
redis.call('EXPIRE', key, windowSeconds * 2)

return { tokens, 0 }
`;

export const rateLimiterMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const ip = req.ip || req.socket.remoteAddress || "unknown";
        const key = `${KEY_PREFIX}${ip}`;
        const now = Math.floor(Date.now() / 1000);

        const result = await redis.eval(
            LUA_SCRIPT,
            1,
            key,
            BUCKET_CAPACITY,
            REFILL_RATE,
            WINDOW_SECONDS,
            now
        ) as number[];

        const remaining = result[0];
        const retryAfter = result[1];

        res.setHeader("X-RateLimit-Limit", BUCKET_CAPACITY);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, remaining));

        if (remaining <= 0 && retryAfter > 0) {
            res.setHeader("Retry-After", retryAfter);
            res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later.",
            });
            return;
        }

        next();
    } catch (error) {
        // If Redis is down, allow the request through (fail-open)
        console.error("Rate limiter error:", error);
        next();
    }
};
