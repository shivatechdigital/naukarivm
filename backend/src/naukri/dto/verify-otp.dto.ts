import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,8}$/, {
    message: 'OTP 4 se 8 digits ka hona chahiye',
  })
  otp: string;
}
