export interface Comment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  content: string;
  parentCommentId: string | null;
  createdAt: string | null;
}

export interface Bookmark {
  id: string;
  postId: string;
  userId: string;
  createdAt: string | null;
}

export interface Like {
  id: string;
  postId: string;
  userId: string;
  createdAt: string | null;
}