import { Router } from "express";
import { summary, recentDeposits, recentWithdrawals } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// All dashboard routes require authentication (any role)
router.use(authMiddleware);

router.get("/summary", summary);
router.get("/recent-deposits", recentDeposits);
router.get("/recent-withdrawals", recentWithdrawals);

export default router;
