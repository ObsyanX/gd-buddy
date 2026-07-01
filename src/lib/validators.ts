import { z } from "zod";

/**
 * Shared Zod validators + form choreography helpers.
 * Prefer these over inline schemas to keep messages, limits and copy consistent.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email")
  .max(255, "Email is too long");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Password is too long")
  .refine((v) => /[A-Z]/.test(v) && /[a-z]/.test(v), "Mix upper- and lower-case letters")
  .refine((v) => /\d/.test(v), "Include at least one number");

export const strongPasswordSchema = passwordSchema.refine(
  (v) => /[^A-Za-z0-9]/.test(v),
  "Include at least one symbol",
);

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(60, "Name must be under 60 characters")
  .regex(/^[\p{L}\p{M}\s.'-]+$/u, "Only letters, spaces and . ' - are allowed");

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be under 24 characters")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Only letters, numbers, . _ - are allowed");

export const urlSchema = z
  .string()
  .trim()
  .url("Enter a full URL (https://…)")
  .max(2048, "URL is too long");

export const shortTextSchema = (max = 120) =>
  z.string().trim().min(1, "This field is required").max(max, `Must be under ${max} characters`);

export const longTextSchema = (max = 1000) =>
  z.string().trim().min(1, "This field is required").max(max, `Must be under ${max} characters`);

/** Reusable auth schemas for sign-in / sign-up forms. */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
  .object({
    displayName: displayNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
