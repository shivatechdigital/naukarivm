import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { AutomationService } from './automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('automation')
@UseGuards(JwtAuthGuard)
export class AutomationController {
  constructor(
    private automationService: AutomationService,
  ) {}

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  async triggerManualCycle(
    @Request() req: AuthenticatedRequest,
  ) {
    return this.automationService.triggerManualCycle(
      req.user.userId,
    );
  }

  @Get('logs')
  async getLogs(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : 10;

    return this.automationService.getUserLogs(
      req.user.userId,
      l,
    );
  }
}
