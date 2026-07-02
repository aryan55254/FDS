/*
This file contains connection to the postgres db instance
*/

import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { User } from "../entities/User";
import { Record } from "../entities/Record";
import { Transaction } from "../entities/Transaction";

dotenv.config();

// Prefer a local Postgres when running in development or when no DATABASE_URL provided.
const defaultLocal = 'postgresql://postgres:postgres@localhost:5432/fds';
// In development prefer the local Docker Postgres instance to avoid accidentally
// connecting to external DBs specified in environment variables.
const effectiveDatabaseUrl = process.env.NODE_ENV === 'production' ? process.env.DATABASE_URL : defaultLocal;
const isSslEnabled = (effectiveDatabaseUrl || "").includes("sslmode=require");

export const AppDataSource = new DataSource({
    type: "postgres",
    url: effectiveDatabaseUrl,
    ssl: isSslEnabled ? { rejectUnauthorized: false } : false,
    synchronize: true,
    logging: false,
    entities: [User, Record, Transaction],
});
