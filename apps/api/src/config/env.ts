import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env from apps/api/.env or current working directory
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(import.meta.dirname ?? '', '../../.env'),
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

/**
 * Backend environment configuration — PRD §74, §103
 *
 * Validates that all required environment variables are present at startup.
 * Uses Zod for runtime validation to fail fast on misconfiguration.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(5000),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    // Firebase Admin SDK credentials
    FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
    FIREBASE_CLIENT_EMAIL: z.string().min(1, 'FIREBASE_CLIENT_EMAIL is required'),
    FIREBASE_PRIVATE_KEY: z.string().min(1, 'FIREBASE_PRIVATE_KEY is required'),

    // CORS
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),

    // AI Provider Configuration — PRD §93, §94, §103
    AI_PROVIDER: z.enum(['mock', 'openai', 'disabled']).default('mock'),
    AI_API_KEY: z.string().optional(),
    AI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
    AI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
    AI_EMBEDDING_DIM: z.coerce.number().default(1536),
    AI_EMBEDDING_VERSION: z.string().default('v1'),
    FEATURE_AI_STUDY_ASSISTANT: z.coerce.boolean().default(true),

    // Initial Super Admin Bootstrap — PRD §103, §104
    SUPER_ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),

    // Background Cron Secret — PRD §103
    CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters for entropy').optional(),

    // Private Document & File Upload Policy — PRD §103, §104
    FEATURE_PRIVATE_FILE_UPLOADS: z.coerce.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.FEATURE_PRIVATE_FILE_UPLOADS === true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['FEATURE_PRIVATE_FILE_UPLOADS'],
        message: 'FEATURE_PRIVATE_FILE_UPLOADS cannot be true: private storage provider (S3/R2) is not yet configured for beta. Keep false.',
      });
    }

    if (data.NODE_ENV === 'production') {
      if (data.AI_PROVIDER === 'mock') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AI_PROVIDER'],
          message: 'MockAIProvider is not permitted in production. Configure openai or disabled.',
        });
      }
      if (data.AI_PROVIDER === 'openai' && !data.AI_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AI_API_KEY'],
          message: 'AI_API_KEY is required in production when AI_PROVIDER is openai',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌ Invalid environment variables:');
      console.error(result.error.flatten().fieldErrors);
      process.exit(1);
    }
    _env = result.data;
  }
  return _env;
}
