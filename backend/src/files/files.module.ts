import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileTypeDetectorService } from './services/file-type-detector.service';
import { FileConverterService } from './services/file-converter.service';
import { FileVersioningService } from './services/file-versioning.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    FileTypeDetectorService,
    FileConverterService,
    FileVersioningService,
  ],
  exports: [
    FilesService,
    FileTypeDetectorService,
    FileConverterService,
    FileVersioningService,
  ],
})
export class FilesModule {}
