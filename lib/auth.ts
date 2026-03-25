import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { config } from "./config";
import { getDb } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  secret: config.betterAuthSecret,
  baseURL: config.betterAuthUrl,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema
  }),
  emailAndPassword: {
    enabled: true
  },
  plugins: [username(), nextCookies()]
});
