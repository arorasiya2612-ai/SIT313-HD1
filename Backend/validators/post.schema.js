
const { z } = require("zod");

const postSchema = z.object({
  postType: z.enum(["question", "article"]),

  postPlan: z.enum(["free", "paid"]),

  title: z.string()
    .trim()
    .min(5, "Title must contain at least 5 characters.")
    .max(150, "Title cannot exceed 150 characters."),

  description: z.string().optional(),

  abstract: z.string().optional(),

  articleText: z.string().optional(),

  tags: z.array(
    z.string()
      .trim()
      .min(1)
      .max(30)
  ).max(3, "A maximum of 3 tags is allowed.")
}).superRefine((data, ctx) => {

  if (data.postType === "question") {
    if (
      !data.description ||
      !data.description.trim() ||
      data.description.trim().length > 5000
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["description"],
        message: "Provide a valid question description."
      });
    }
  }

  if (data.postType === "article") {
    if (
      !data.abstract ||
      !data.abstract.trim() ||
      data.abstract.trim().length > 1000
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["abstract"],
        message: "Provide a valid article abstract."
      });
    }

    if (
      !data.articleText ||
      !data.articleText.trim() ||
      data.articleText.trim().length > 20000
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["articleText"],
        message: "Provide valid article content."
      });
    }
  }

});

module.exports = { postSchema };
