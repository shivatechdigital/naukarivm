import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';

import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
  ) {}

  @Post()
  create(
    @Request() req: any,
    @Body() dto: CreateProfileDto,
  ) {
    return this.profilesService.create(
      req.user.userId,
      dto,
    );
  }

  @Get('me')
  getMyProfile(
    @Request() req: any,
  ) {
    return this.profilesService.findOne(
      req.user.userId,
    );
  }

  @Put('me')
  updateMyProfile(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.update(
      req.user.userId,
      dto,
    );
  }

  @Get('completion')
  getCompletion(
    @Request() req: any,
  ) {
    return this.profilesService.getCompletion(
      req.user.userId,
    );
  }
}
