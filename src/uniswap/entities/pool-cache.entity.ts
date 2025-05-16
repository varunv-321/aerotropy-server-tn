import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * Entity to store cached pool data for different strategies
 */
@Entity('pool_cache')
export class PoolCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  strategy: string; // 'low', 'medium', 'high'

  @Column({ type: 'varchar', length: 20 })
  network: string; // 'base', etc.

  @Column({ type: 'jsonb' })
  poolData: any; // Storing the full pool data as JSON

  @Column({ type: 'float', nullable: true })
  averageApr: number; // Calculated average APR across all pools in this strategy

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  version: string; // Uniswap version - 'v3', 'v4', etc.
}
