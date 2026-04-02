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
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "fds",
    synchronize: true,
    logging: false,
    entities: [User, Record, Transaction],
});
