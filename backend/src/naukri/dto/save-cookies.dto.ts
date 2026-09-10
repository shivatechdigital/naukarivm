import { IsNotEmpty, IsString } from 'class-validator';

export class SaveCookiesDto {
  @IsString()
  @IsNotEmpty({ message: 'Cookies string ya JSON zaroori hai' })
  cookiesData: string; // JSON string ya document.cookie string
}
