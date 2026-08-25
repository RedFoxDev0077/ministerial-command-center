import {
  Controller, Get, Post, Delete, Body, Param, Request,
  UseGuards, UseInterceptors, UploadedFile, UploadedFiles, NotFoundException, StreamableFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MultimediaService } from './multimedia.service';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Multimedia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('multimedia')
export class MultimediaController {
  constructor(private readonly multimediaService: MultimediaService) {}

  @Get()
  findAll(@Request() req) {
    return this.multimediaService.findAll(req.user.id);
  }

  // Must be before /:id to avoid "frames" being captured as an id
  @Get('frames/:recordId/:filename')
  serveFrame(
    @Param('recordId') recordId: string,
    @Param('filename') filename: string,
  ): StreamableFile {
    const framePath = this.multimediaService.getFrameFilePath(recordId, filename);
    if (!fs.existsSync(framePath)) throw new NotFoundException('Imagen no encontrada');
    return new StreamableFile(fs.createReadStream(framePath), { type: 'image/jpeg' });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.multimediaService.findOne(id);
  }

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/multimedia',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      },
    }),
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB — large interview videos
    fileFilter: (req, file, cb) => {
      const allowed = /^(audio|video)\//;
      if (allowed.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos de audio o video'), false);
      }
    },
  }))
  transcribe(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.multimediaService.transcribe(file, req.user.id);
  }

  // Photo batch -> AI picks the best for publication.
  // Declared before ':id' routes so "photos" is not captured as a record id.
  @Post('photos/select-best')
  @UseInterceptors(FilesInterceptor('files', 30, {
    storage: diskStorage({
      destination: './uploads/multimedia',
      filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
      },
    }),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per photograph
    fileFilter: (req, file, cb) => {
      if (/^image\//.test(file.mimetype)) cb(null, true);
      else cb(new Error('Solo se permiten archivos de imagen'), false);
    },
  }))
  selectBestPhotos(@UploadedFiles() files: Express.Multer.File[], @Request() req) {
    return this.multimediaService.selectBestPhotos(files, req.user.id);
  }

  @Post(':id/press-release')
  generatePressRelease(@Param('id') id: string) {
    return this.multimediaService.generatePressRelease(id);
  }

  @Post(':id/summary')
  generateSummary(@Param('id') id: string) {
    return this.multimediaService.generateSummary(id);
  }

  @Post(':id/social-post')
  generateSocialPost(@Param('id') id: string) {
    return this.multimediaService.generateSocialPost(id);
  }

  @Post(':id/translate')
  translate(@Param('id') id: string, @Body() body: { language: string }) {
    return this.multimediaService.translate(id, body.language || 'en');
  }

  @Post(':id/technical-opinion')
  technicalOpinion(@Param('id') id: string) {
    return this.multimediaService.generateTechnicalOpinion(id);
  }

  @Post(':id/extract-frames')
  extractFrames(@Param('id') id: string) {
    return this.multimediaService.extractBestFrames(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.multimediaService.remove(id);
  }
}
