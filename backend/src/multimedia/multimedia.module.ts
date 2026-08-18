import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MultimediaService } from './multimedia.service';
import { MultimediaController } from './multimedia.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [MultimediaController],
  providers: [MultimediaService],
})
export class MultimediaModule {}
