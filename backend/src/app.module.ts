import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PreferencesModule } from './preferences/preferences.module';
import { NaukriModule } from './naukri/naukri.module';
import { JobsModule } from './jobs/jobs.module';  
import { ApplicationsModule } from './applications/applications.module';
import { AutomationModule } from './automation/automation.module';

export const {
  ObserveModule,
  ObserveInstrument,
} = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ObserveModule.forRoot({
      appKey:
        process.env.OBSERVE_APP_KEY ||
        'YOUR_APP_KEY',

      appSecret:
        process.env.OBSERVE_APP_SECRET ||
        'YOUR_APP_SECRET',

      serviceId: 'backend',
    }),

    UsersModule,
    AuthModule,
    ProfilesModule,
    PreferencesModule,
    NaukriModule,
    JobsModule,
    ApplicationsModule,
    AutomationModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
