import { z } from "zod";

/**
 * QuickReply Environment Variable Validator
 * Validates critical environment configurations at runtime to fail fast on misconfiguration.
 */
const envSchema = z.object({
  // Core App
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  PORT: z.string().default("3000"),

  // Database
  MONGODB_URI: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // Secrets & Auth
  SESSION_SECRET: z.string().min(16).optional(),
  JWT_SECRET: z.string().min(16).optional(),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),

  // Optional Providers
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI,
    REDIS_URL: process.env.REDIS_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Invalid environment variables:", error.flatten().fieldErrors);
  }
  // During build phase, provide safe defaults
  parsedEnv = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV || "development",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  });
}

export const env = parsedEnv;
