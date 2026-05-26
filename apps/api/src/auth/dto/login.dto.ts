import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '请输入用户名' })
  @MaxLength(50, { message: '用户名不能超过 50 个字符' })
  username!: string;

  @IsString()
  @IsNotEmpty({ message: '请输入密码' })
  @MinLength(6, { message: '密码不能少于 6 个字符' })
  @MaxLength(100, { message: '密码不能超过 100 个字符' })
  password!: string;
}
