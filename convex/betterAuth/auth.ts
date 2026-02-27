import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import schema from "./schema";

// Better Auth Component
export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  {
    local: { schema },
    verbose: false,
  },
);

// Better Auth Options
export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    appName: "Interior Advisor",
    baseURL: process.env.SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [process.env.SITE_URL ?? "http://localhost:3000"],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: false,
    },
    plugins: [
      convex({ authConfig }),
      emailOTP({
        sendVerificationOTP: async ({ email, otp }) => {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "Interior Advisor <noreply@jeroennelen.nl>",
            to: email,
            subject: "Your sign-in code for Interior Advisor",
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2>Sign in to Interior Advisor</h2>
                <p style="color: #555; margin-bottom: 24px;">Your sign-in code is:</p>
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f4f4f5; border-radius: 8px;">
                  ${otp}
                </div>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">
                  This code expires in 10 minutes. If you didn't request this, ignore this email.
                </p>
              </div>
            `,
          });
        },
      }),
    ],
  } satisfies BetterAuthOptions;
};

// For `@better-auth/cli`
export const options = createAuthOptions({} as GenericCtx<DataModel>);

// Better Auth Instance
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
