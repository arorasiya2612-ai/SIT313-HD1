
const { z } = require("zod");

const registerSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(60, "Name cannot exceed 60 characters."),

  email: z.string()
    .trim()
    .email("Enter a valid email address.")
    .transform((email) => email.toLowerCase()),

  password: z.string()
    .min(8, "Password must contain at least 8 characters.")
    .max(72, "Password is too long."),

  confirmPassword: z.string().optional()
}).refine(
  (data) =>
    data.confirmPassword === undefined ||
    data.password === data.confirmPassword,
  {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  }
);

const loginSchema = z.object({
  email: z.string()
    .trim()
    .email("Enter a valid email address.")
    .transform((email) => email.toLowerCase()),

  password: z.string()
    .min(1, "Password is required.")
});

module.exports = {
  registerSchema,
  loginSchema
};
