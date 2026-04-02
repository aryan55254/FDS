import { Router } from "express";
import {
    deposit,
    withdraw,
    softDelete,
    hardDelete,
    filterMin,
    filterMax,
    searchAmount,
} from "../controllers/transaction.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import { depositSchema, withdrawSchema, amtParamSchema } from "../validators/transaction.validators";

const router = Router();

// All transaction routes require authentication
router.use(authMiddleware);

// Financial Ledger (Admin Only)
router.post("/deposit", authorize("admin"), validate(depositSchema), deposit);
router.post("/withdraw", authorize("admin"), validate(withdrawSchema), withdraw);
router.patch("/:id/soft-delete", authorize("admin"), softDelete);
router.delete("/:id", authorize("admin"), hardDelete);

// Advanced Filters (Admin & Analyst)
router.get("/filter/min/:amt", authorize("admin", "analyst"), validate(amtParamSchema, "params"), filterMin);
router.get("/filter/max/:amt", authorize("admin", "analyst"), validate(amtParamSchema, "params"), filterMax);
router.get("/search/:amt", authorize("admin", "analyst"), validate(amtParamSchema, "params"), searchAmount);

export default router;
