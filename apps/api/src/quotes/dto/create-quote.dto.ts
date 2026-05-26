import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateQuoteDto {
  @IsNumber()
  workOrderId!: number;

  @IsNumber()
  @IsPositive()
  totalAmount!: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  costAmount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  repairItems?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  partItems?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  chargeItems?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;

  @IsNumber()
  @IsOptional()
  creatorId?: number;
}
