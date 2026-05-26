import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength, Matches, IsLatitude, IsLongitude, IsNumber, Min } from 'class-validator';

export class CreateCustomerRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号' })
  phone!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  company?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address!: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  locationAccuracy?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  machineSerial?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  machineCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  machineModel?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: '故障描述至少 10 个字' })
  @MaxLength(1000)
  faultDesc!: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000000)
  faultPhotos?: string;

  @IsString()
  @IsOptional()
  submitFingerprint?: string;

  // 蜜罐字段 — 隐藏的表单字段，正常用户不会填写，bot 会自动填写
  @IsOptional()
  website?: string;
}
