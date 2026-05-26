import { IsNumber, IsOptional, IsPositive, IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateReceiptDto {
  @IsNumber()
  workOrderId!: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: '维修总结至少 5 个字' })
  @MaxLength(2000)
  repairSummary!: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  repairItems?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  partItems?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  chargeItems?: string;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  totalAmount?: number;
}
