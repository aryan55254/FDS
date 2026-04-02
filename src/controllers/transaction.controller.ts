/*
This file contains the controllers for the transaction routes.
*/

import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Record } from "../entities/Record";
import { Transaction, TransactionType } from "../entities/Transaction";
import { MoreThan, LessThan } from "typeorm";

const recordRepo = () => AppDataSource.getRepository(Record);
const txRepo = () => AppDataSource.getRepository(Transaction);

/**
 * Get or create the single ledger record.
 */
const getOrCreateRecord = async (): Promise<Record> => {
    let record = await recordRepo().findOne({ where: {} });
    if (!record) {
        record = recordRepo().create({ current_balance: 0 });
        await recordRepo().save(record);
    }
    return record;
};

// Financial Ledger (Admin Only)

export const deposit = async (req: Request, res: Response): Promise<void> => {
    try {
        const { amount } = req.body;
        const record = await getOrCreateRecord();

        const amtBefore = record.current_balance;
        const amtAfter = amtBefore + amount;

        // Update balance
        record.current_balance = amtAfter;
        await recordRepo().save(record);

        // Create transaction log
        const tx = txRepo().create({
            type: TransactionType.INCOME,
            amount,
            amt_before: amtBefore,
            amt_after: amtAfter,
            done_by: req.user!.username,
            record,
        });
        await txRepo().save(tx);

        res.status(201).json({
            success: true,
            message: "Deposit successful.",
            data: { transaction_id: tx.id, current_balance: amtAfter },
        });
    } catch (error) {
        console.error("Deposit error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const withdraw = async (req: Request, res: Response): Promise<void> => {
    try {
        const { amount } = req.body;
        const record = await getOrCreateRecord();

        const amtBefore = record.current_balance;

        if (amount > amtBefore) {
            res.status(400).json({ success: false, message: "Insufficient balance." });
            return;
        }

        const amtAfter = amtBefore - amount;

        record.current_balance = amtAfter;
        await recordRepo().save(record);

        const tx = txRepo().create({
            type: TransactionType.WITHDRAWAL,
            amount,
            amt_before: amtBefore,
            amt_after: amtAfter,
            done_by: req.user!.username,
            record,
        });
        await txRepo().save(tx);

        res.status(201).json({
            success: true,
            message: "Withdrawal successful.",
            data: { transaction_id: tx.id, current_balance: amtAfter },
        });
    } catch (error) {
        console.error("Withdraw error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const softDelete = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            res.status(400).json({ success: false, message: "Invalid transaction ID format." });
            return;
        }
        const tx = await txRepo().findOne({ where: { id } });

        if (!tx) {
            res.status(404).json({ success: false, message: "Transaction not found." });
            return;
        }

        tx.is_deleted = true;
        await txRepo().save(tx);

        res.status(200).json({ success: true, message: "Transaction soft-deleted." });
    } catch (error) {
        console.error("Soft delete error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const hardDelete = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            res.status(400).json({ success: false, message: "Invalid transaction ID format." });
            return;
        }
        const tx = await txRepo().findOne({ where: { id } });

        if (!tx) {
            res.status(404).json({ success: false, message: "Transaction not found." });
            return;
        }

        await txRepo().remove(tx);

        res.status(200).json({ success: true, message: "Transaction permanently deleted." });
    } catch (error) {
        console.error("Hard delete error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// Advanced Filters (Admin & Analyst)

export const filterMin = async (req: Request, res: Response): Promise<void> => {
    try {
        const amt = Number(req.params.amt);
        const transactions = await txRepo().find({
            where: { amount: MoreThan(amt), is_deleted: false },
            order: { timestamp: "DESC" },
        });

        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        console.error("Filter min error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const filterMax = async (req: Request, res: Response): Promise<void> => {
    try {
        const amt = Number(req.params.amt);
        const transactions = await txRepo().find({
            where: { amount: LessThan(amt), is_deleted: false },
            order: { timestamp: "DESC" },
        });

        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        console.error("Filter max error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const searchAmount = async (req: Request, res: Response): Promise<void> => {
    try {
        const amt = Number(req.params.amt);
        // Uses the @Index on amount column for fast retrieval
        const transactions = await txRepo().find({
            where: { amount: amt, is_deleted: false },
            order: { timestamp: "DESC" },
        });

        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        console.error("Search amount error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};
