import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

@Injectable()
export class OpenAIService implements OnModuleInit {
    private client: OpenAI;

    onModuleInit() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * Create a chat completion
     * @param messages Array of chat messages
     * @param model OpenAI model to use (default: gpt-4o-mini)
     * @param options Additional options like temperature, max_tokens, etc.
     */
    async createChatCompletion(
        messages: ChatCompletionMessageParam[],
        model: string = 'gpt-4o-mini',
        options?: {
            temperature?: number;
            maxTokens?: number;
            topP?: number;
            frequencyPenalty?: number;
            presencePenalty?: number;
        },
    ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
        return this.client.chat.completions.create({
            model,
            messages,
            temperature: options?.temperature,
            max_tokens: options?.maxTokens,
            top_p: options?.topP,
            frequency_penalty: options?.frequencyPenalty,
            presence_penalty: options?.presencePenalty,
        });
    }

    /**
     * Create embeddings for the given input text(s)
     * @param input Text or array of texts to embed
     * @param model Embedding model to use (default: text-embedding-3-small)
     */
    async createEmbedding(
        input: string | string[],
        model: string = 'text-embedding-3-small',
    ): Promise<OpenAI.Embeddings.CreateEmbeddingResponse> {
        return this.client.embeddings.create({
            model,
            input,
        });
    }

    /**
     * Get the raw OpenAI client for advanced usage
     */
    getClient(): OpenAI {
        return this.client;
    }
}
