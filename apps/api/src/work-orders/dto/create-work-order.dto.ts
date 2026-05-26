import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, MaxLength } from 'class-validator';

export class CreateWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @IsEnum(['NORMAL', 'URGENT', 'CRITICAL'])
  priority!: string;

  @IsEnum(['CUSTOMER_H5', 'PHONE', 'PC', 'OTHER'])
  source!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  customerNameSnapshot!: string;

  @IsString()
  @IsNotEmpty()
  customerPhoneSnapshot!: string;

  @IsString()
  @IsNotEmpty()
  serviceAddressSnapshot!: string;

  @IsString()
  @IsNotEmpty()
  faultDesc!: string;

  @IsNumber()
  @IsOptional()
  customerId?: number;

  @IsNumber()
  @IsOptional()
  machineId?: number;

  @IsString()
  @IsOptional()
  machineSerialSnapshot?: string;

  @IsString()
  @IsOptional()
  machineModelSnapshot?: string;

  @IsNumber()
  @IsOptional()
  outletId?: number;

  @IsNumber()
  @IsOptional()
  estimatedCost?: number;
}
