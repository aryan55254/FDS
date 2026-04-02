/*
This file contains the controllers for the dashboard routes.
*/

import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Record } from "../entities/Record";
import { Transaction, TransactionType } from "../entities/Transaction";

const recordRepo = () => AppDataSource.getRepository(Record);
const txRepo = () => AppDataSource.getRepository(Transaction);

const getOrCreateRecord = async (): Promise<Record> => {
    let record = await recordRepo().findOne({ where: {} });
    if (!record) {
        record = recordRepo().create({ current_balance: 0 });
        await recordRepo().save(record);
    }
    return record;
};

export const summary = async (_req: Request, res: Response): Promise<void> => {
    try {
        const record = await getOrCreateRecord();
        const transactions = await txRepo().find({
            where: { is_deleted: false },
            order: { timestamp: "DESC" },
            take: 10,
        });

        res.status(200).json({
            success: true,
            data: {
                current_balance: record.current_balance,
                recent_transactions: transactions,
            },
        });
    } catch (error) {
        console.error("Summary error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const recentDeposits = async (_req: Request, res: Response): Promise<void> => {
    try {
        const record = await getOrCreateRecord();
        const transactions = await txRepo().find({
            where: { type: TransactionType.INCOME, is_deleted: false },
            order: { timestamp: "DESC" },
            take: 10,
        });

        res.status(200).json({
            success: true,
            data: {
                current_balance: record.current_balance,
                recent_deposits: transactions,
            },
        });
    } catch (error) {
        console.error("Recent deposits error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const recentWithdrawals = async (_req: Request, res: Response): Promise<void> => {
    try {
        const record = await getOrCreateRecord();
        const transactions = await txRepo().find({
            where: { type: TransactionType.WITHDRAWAL, is_deleted: false },
            order: { timestamp: "DESC" },
            take: 10,
        });

        res.status(200).json({
            success: true,
            data: {
                current_balance: record.current_balance,
                recent_withdrawals: transactions,
            },
        });
    } catch (error) {
        console.error("Recent withdrawals error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};
