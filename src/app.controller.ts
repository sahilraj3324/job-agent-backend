import { Body, Controller, Get, Post, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AppService } from './app.service';
import { OpenAIService } from './openai';
import { JDParserService } from './agents/jd-parser';

class ParseJDDto {
  text: string;
}

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly openaiService: OpenAIService,
    private readonly jdParserService: JDParserService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Returns hello message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test/chat')
  @ApiOperation({ summary: 'Test OpenAI chat completion' })
  @ApiResponse({ status: 200, description: 'Returns OpenAI response' })
  async testChat() {
    const response = await this.openaiService.createChatCompletion([
      { role: 'user', content: 'Say "Hello, OpenAI is working!" in exactly 5 words.' },
    ]);
    return {
      success: true,
      message: response.choices[0].message.content,
      model: response.model,
    };
  }

  @Get('test/embedding')
  @ApiOperation({ summary: 'Test OpenAI embedding generation' })
  @ApiResponse({ status: 200, description: 'Returns embedding preview' })
  async testEmbedding() {
    const response = await this.openaiService.createEmbedding('Hello world');
    return {
      success: true,
      embeddingLength: response.data[0].embedding.length,
      model: response.model,
      preview: response.data[0].embedding.slice(0, 5),
    };
  }

  @Post('test/parse-jd')
  @ApiOperation({ summary: 'Test job description parsing' })
  @ApiBody({ type: ParseJDDto })
  @ApiResponse({ status: 200, description: 'Returns parsed job description' })
  @ApiResponse({ status: 400, description: 'Text is required' })
  async testParseJD(@Body('text') text: string) {
    if (!text) {
      throw new BadRequestException('Text is required');
    }
    const parsed = await this.jdParserService.parse(text);
    return { success: true, data: parsed };
  }
}
