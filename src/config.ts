import { z } from "zod";

const configSchema = z.object({
  username: z.string().email(),
  password: z.string().min(1),
  accountId: z.number().int().positive(),
  menuId: z.number().int().positive(),
  port: z.number().int().positive().default(3000),
});

const config = configSchema.parse({
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  accountId: process.env.ACCOUNT_ID
    ? parseInt(process.env.ACCOUNT_ID)
    : undefined,
  menuId: process.env.MENU_ID ? parseInt(process.env.MENU_ID) : undefined,
  port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
});

export default config;
