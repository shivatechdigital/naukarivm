import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NaukriService } from './naukri.service';
import { ConnectNaukriDto } from './dto/connect-naukri.dto';
import { SaveCookiesDto } from './dto/save-cookies.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request as ExpressRequest } from 'express';

@Controller('naukri')
@UseGuards(JwtAuthGuard)
export class NaukriController {
  constructor(private naukriService: NaukriService) {}

  // ─── POST /api/naukri/connect ───
  // Naukri credentials lo, login karo, session save karo
  @Post('connect')
  @HttpCode(HttpStatus.OK)
  async connect(@Request() req: ExpressRequest & { user: { userId: string } }, @Body() dto: ConnectNaukriDto) {
    return this.naukriService.connect(req.user.userId, dto);
  }


  // ─── POST /api/naukri/verify-otp ───
  // Same Playwright session par Naukri OTP verify karo
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Body() dto: VerifyOtpDto,
  ) {
    return this.naukriService.verifyOtp(
      req.user.userId,
      dto.otp,
    );
  }


  // ─── POST /api/naukri/cookies ───
  // Save manually supplied Naukri session cookies
  @Post('cookies')
  @HttpCode(HttpStatus.OK)
  async saveCookies(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Body() dto: SaveCookiesDto,
  ) {
    return this.naukriService.saveDirectCookies(
      req.user.userId,
      dto.cookiesData,
    );
  }

  // ─── GET /api/naukri/status ───
  // Quick check — connected hai ya nahi (no browser)
  @Get('status')
  async getStatus(@Request() req: ExpressRequest & { user: { userId: string } }) {
    return this.naukriService.getStatus(req.user.userId);
  }

  // ─── POST /api/naukri/verify ───
  // Browser se verify karo ki session valid hai
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifySession(@Request() req: ExpressRequest & { user: { userId: string } }) {
    return this.naukriService.verifySession(req.user.userId);
  }

  // ─── DELETE /api/naukri/disconnect ───
  // Session delete karo
  @Delete('disconnect')
  async disconnect(@Request() req: ExpressRequest & { user: { userId: string } }) {
    return this.naukriService.disconnect(req.user.userId);
  }
}
