import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    Index,
} from "typeorm";
import { Record } from "./Record";

export enum TransactionType {
    INCOME = "income",
    WITHDRAWAL = "withdrawal",
}

@Entity("transactions")
export class Transaction {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "enum", enum: TransactionType })
    type!: TransactionType;

    @Index()
    @Column({ type: "int" })
    amount!: number;

    @Column({ type: "int" })
    amt_before!: number;

    @Column({ type: "int" })
    amt_after!: number;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    timestamp!: Date;

    @Column({ type: "varchar", length: 100 })
    done_by!: string;

    @Column({ type: "boolean", default: false })
    is_deleted!: boolean;

    @ManyToOne(() => Record, (record) => record.transactions)
    record!: Record;
}
