import { z } from "zod";

const configSchema = z.object({
  username: z.string().email(),
  password: z.string().min(1),
  port: z.number().int().positive().default(3000),
});

const config = configSchema.parse({
  username: process.env.QUICKCLICK_USERNAME,
  password: process.env.QUICKCLICK_PASSWORD,
  port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
});

export default config;
