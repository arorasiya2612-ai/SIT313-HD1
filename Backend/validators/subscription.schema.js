
const { z } = require("zod");

const upgradeSchema = z.object({
  cardholderName: z.string()
    .trim()
    .min(2, "Enter the cardholder name."),

  cardNumber: z.string()
    .transform((value) => value.replace(/\s/g, ""))
    .refine(
      (value) => /^\d{16}$/.test(value),
      "Enter a valid 16-digit demonstration card number."
    ),

  expiry: z.string()
    .regex(
      /^(0[1-9]|1[0-2])\/\d{2}$/,
      "Expiry must use MM/YY format."
    ),

  cvv: z.string()
    .regex(/^\d{3,4}$/, "Enter a valid CVV.")
});

module.exports = { upgradeSchema };
