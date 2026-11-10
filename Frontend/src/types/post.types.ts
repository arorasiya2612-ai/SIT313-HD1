export type PostType = "question" | "article";

export type PostStatus = "published" | "removed";

export interface Post {
  id: string;
  userId: string;
  title: string;
  description: string;
  authorName: string;
  postType: PostType;
  postPlan: "free" | "paid";
  status: PostStatus;
  tags: string[];
  createdAt: string | null;
  isLocked?: boolean;
}