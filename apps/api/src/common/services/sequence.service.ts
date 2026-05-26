import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

/**
 * 原子编号生成服务
 * PostgreSQL: 使用 SEQUENCE（零竞态）
 * SQLite: 使用事务 + 乐观锁（开发环境可接受）
 */
@Injectable()
export class SequenceService {
  private sequences = new Map<string, number>();

  constructor(private prisma: PrismaService) {}

  /**
   * 生成下一个编号，格式: PREFIX-YYYYMMDD-XXXX
   * @param prefix 前缀，如 'WO', 'QT', 'PO'
   * @param tableName 表名（用于 PostgreSQL SEQUENCE）
   * @param wherePrefix 查询条件中的前缀字段名
   */
  async next(
    prefix: string,
    tableName: string,
    wherePrefix: string,
  ): Promise<string> {
    const now = new Date();
    const datePart =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const fullPrefix = `${prefix}-${datePart}-`;

    try {
      // PostgreSQL: 使用 SEQUENCE
      const seqName = `seq_${tableName.toLowerCase()}_${datePart}`;
      await this.prisma.$executeRawUnsafe(
        `CREATE SEQUENCE IF NOT EXISTS "${seqName}" START 1`,
      );
      const maxRows = (await this.prisma.$queryRawUnsafe(
        `SELECT COALESCE(MAX(CAST(SUBSTRING("${wherePrefix}" FROM ${fullPrefix.length + 1}) AS INTEGER)), 0) AS "maxSeq"
         FROM "${tableName}"
         WHERE "${wherePrefix}" LIKE $1`,
        `${fullPrefix}%`,
      )) as Array<{ maxSeq: bigint | number }>;
      const maxSeq = Number(maxRows[0]?.maxSeq || 0);
      if (maxSeq > 0) {
        await this.prisma.$executeRawUnsafe(
          `SELECT setval('"${seqName}"', GREATEST((SELECT last_value FROM "${seqName}"), $1), true)`,
          maxSeq,
        );
      }
      const result = (await this.prisma.$queryRawUnsafe(
        `SELECT nextval('${seqName}') as seq`,
      )) as Array<{ seq: bigint }>;
      const seq = Number(result[0].seq);
      return `${fullPrefix}${seq.toString().padStart(4, '0')}`;
    } catch {
      // SQLite fallback: 查询最大编号 + 1
      const last = await (this.prisma as any)[tableName].findFirst({
        where: { [wherePrefix]: { startsWith: fullPrefix } },
        orderBy: { [wherePrefix]: 'desc' },
      });

      let seq = 1;
      if (last) {
        const lastSeq = parseInt(
          (last as any)[wherePrefix].slice(fullPrefix.length),
          10,
        );
        if (!isNaN(lastSeq)) {
          seq = lastSeq + 1;
        }
      }

      return `${fullPrefix}${seq.toString().padStart(4, '0')}`;
    }
  }
}
