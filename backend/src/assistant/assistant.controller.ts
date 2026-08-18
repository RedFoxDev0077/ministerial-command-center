import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssistantService } from './assistant.service';

@Controller('assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private assistantService: AssistantService) {}

  @Post('chat')
  async chat(
    @Body()
    body: {
      message: string;
      conversationHistory?: Array<{ role: string; content: string }>;
    },
  ) {
    const response = await this.assistantService.getResponse(
      body.message,
      body.conversationHistory || [],
    );

    return { response };
  }
}
