import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { OpenAIService } from './openai';
import { JDParserService } from './agents/jd-parser';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly openaiService: OpenAIService,
    private readonly jdParserService: JDParserService,
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test/chat')
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
  async testParseJD(@Body('text') text: string) {
    const parsed = await this.jdParserService.parse(text);
    return { success: true, data: parsed };
  }
}
