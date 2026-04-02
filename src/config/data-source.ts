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

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    synchronize: true,
    logging: false,
    entities: [User, Record, Transaction],
});
