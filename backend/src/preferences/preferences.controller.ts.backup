import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';

import { PreferencesService } from './preferences.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('preferences')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(
    private readonly preferencesService: PreferencesService,
  ) {}

  @Post()
  create(
    @Request() req: any,
    @Body() dto: CreatePreferenceDto,
  ) {
    return this.preferencesService.create(
      req.user.userId,
      dto,
    );
  }

  @Get('me')
  getMyPreferences(
    @Request() req: any,
  ) {
    return this.preferencesService.findOne(
      req.user.userId,
    );
  }

  @Put('me')
  updateMyPreferences(
    @Request() req: any,
    @Body() dto: UpdatePreferenceDto,
  ) {
    return this.preferencesService.update(
      req.user.userId,
      dto,
    );
  }

  @Patch('toggle')
  toggleAutomation(
    @Request() req: any,
  ) {
    return this.preferencesService.toggleAutomation(
      req.user.userId,
    );
  }
}
