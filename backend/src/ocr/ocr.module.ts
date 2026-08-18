import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { TextFormatterService } from './text-formatter.service';

@Module({
  providers: [OcrService, TextFormatterService],
  exports: [OcrService],
})
export class OcrModule {}
