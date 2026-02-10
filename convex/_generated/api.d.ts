/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_advisor from "../ai/advisor.js";
import type * as ai_imageGeneration from "../ai/imageGeneration.js";
import type * as ai_sceneAnalysis from "../ai/sceneAnalysis.js";
import type * as analyses from "../analyses.js";
import type * as projects from "../projects.js";
import type * as recommendations from "../recommendations.js";
import type * as rooms from "../rooms.js";
import type * as styleQuiz from "../styleQuiz.js";
import type * as visualizations from "../visualizations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/advisor": typeof ai_advisor;
  "ai/imageGeneration": typeof ai_imageGeneration;
  "ai/sceneAnalysis": typeof ai_sceneAnalysis;
  analyses: typeof analyses;
  projects: typeof projects;
  recommendations: typeof recommendations;
  rooms: typeof rooms;
  styleQuiz: typeof styleQuiz;
  visualizations: typeof visualizations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
