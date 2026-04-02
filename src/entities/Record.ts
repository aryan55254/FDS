import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
} from "typeorm";
import { Transaction } from "../entities/Transaction";

@Entity("records")
export class Record {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "int", default: 0 })
    current_balance!: number;

    @OneToMany(() => Transaction, (transaction) => transaction.record)
    transactions!: Transaction[];
}
