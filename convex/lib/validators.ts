/**
 * Server-side validation utilities
 * These functions provide additional validation beyond Convex's built-in validators
 */

/**
 * Validates string length is within acceptable bounds
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  minLength: number,
  maxLength: number
): void {
  if (value.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }
  if (value.length > maxLength) {
    throw new Error(`${fieldName} must not exceed ${maxLength} characters`);
  }
}

/**
 * Validates that a string doesn't contain potential XSS patterns
 */
export function validateNoXSS(value: string, fieldName: string): void {
  const xssPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i, // event handlers like onclick=
    /<embed/i,
    /<object/i,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(value)) {
      throw new Error(`${fieldName} contains invalid characters`);
    }
  }
}

/**
 * Validates a budget amount is reasonable
 */
export function validateBudget(total: number, spent: number): void {
  if (total < 0) {
    throw new Error("Budget total cannot be negative");
  }
  if (spent < 0) {
    throw new Error("Budget spent cannot be negative");
  }
  if (total > 10_000_000) {
    throw new Error("Budget total exceeds maximum allowed ($10M)");
  }
  if (spent > total) {
    throw new Error("Budget spent cannot exceed total budget");
  }
}

/**
 * Validates room dimensions are reasonable
 */
export function validateDimensions(
  width: number,
  length: number,
  height?: number
): void {
  if (width <= 0 || width > 1000) {
    throw new Error("Width must be between 0 and 1000");
  }
  if (length <= 0 || length > 1000) {
    throw new Error("Length must be between 0 and 1000");
  }
  if (height !== undefined && (height <= 0 || height > 100)) {
    throw new Error("Height must be between 0 and 100");
  }
}

/**
 * Validates visualization prompt is within safe limits
 */
export function validatePrompt(prompt: string): void {
  validateStringLength(prompt, "Prompt", 1, 1000);
  validateNoXSS(prompt, "Prompt");
}

/**
 * Validates room type is from allowed list
 */
export function validateRoomType(type: string): void {
  const allowedTypes = [
    "living_room",
    "bedroom",
    "kitchen",
    "bathroom",
    "dining_room",
    "home_office",
    "entryway",
    "outdoor",
    "other",
  ];

  if (!allowedTypes.includes(type)) {
    throw new Error(`Invalid room type: ${type}`);
  }
}
