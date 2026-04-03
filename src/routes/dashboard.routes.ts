import { Router } from "express";
import { summary, recentDeposits, recentWithdrawals } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { cacheMiddleware } from "../middlewares/cache.middleware";

const router = Router();

// All dashboard routes require authentication (any role)
router.use(authMiddleware);

// Cache dashboard responses in Redis for 30 seconds
router.get("/summary", cacheMiddleware(30), summary);
router.get("/recent-deposits", cacheMiddleware(30), recentDeposits);
router.get("/recent-withdrawals", cacheMiddleware(30), recentWithdrawals);

export default router;
