export type UserRole = "user" | "admin";

export type SubscriptionPlan = "free" | "paid";

export type AccountStatus = "active" | "suspended";

export interface User {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  plan: SubscriptionPlan;
  accountStatus: AccountStatus;
  createdAt?: string;
}