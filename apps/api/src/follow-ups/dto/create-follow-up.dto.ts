import { IsNumber, IsString, IsOptional, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreateFollowUpDto {
  @IsNumber()
  workOrderId!: number;

  @IsNumber()
  specialistId!: number;
}

export class CompleteFollowUpDto {
  @IsString()
  @MinLength(5, { message: '回访结果至少 5 个字' })
  @MaxLength(1000)
  contactResult!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  satisfaction!: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  feedback?: string;

  @IsOptional()
  needReopen?: boolean;
}

export class ExceptionFollowUpDto {
  @IsString()
  @MinLength(1, { message: '异常类型不能为空' })
  @MaxLength(50)
  type!: string;

  @IsString()
  @MinLength(5, { message: '异常说明至少 5 个字' })
  @MaxLength(500)
  note!: string;
}
