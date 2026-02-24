import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
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
      enabled: false, // Disable email/password, use magic link instead
    },
    plugins: [
      convex({ authConfig }),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            // Update this to your verified Resend domain for production
            from: "Interior Advisor <noreply@jeroennelen.nl>",
            to: email,
            subject: "Your sign-in link for Interior Advisor",
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="margin-bottom: 8px;">Sign in to Interior Advisor</h2>
                <p style="color: #555; margin-bottom: 24px;">
                  Click the button below to sign in. This link expires in 15 minutes.
                </p>
                <a href="${url}" style="display: inline-block; background: #18181b; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
                  Sign in
                </a>
                <p style="color: #888; font-size: 13px; margin-top: 24px;">
                  If you didn't request this, you can safely ignore this email.
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
