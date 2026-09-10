import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ConnectNaukriDto {
  @IsEmail({}, { message: 'Valid Naukri email daalo' })
  @IsNotEmpty()
  naukriEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password kam se kam 6 characters ka hona chahiye' })
  naukriPassword: string;
}
