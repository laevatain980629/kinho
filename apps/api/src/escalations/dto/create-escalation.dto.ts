import { IsNumber, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateEscalationDto {
  @IsNumber()
  workOrderId!: number;

  @IsString()
  @MinLength(10, { message: '升级原因至少 10 个字' })
  @MaxLength(500)
  reason!: string;
}
