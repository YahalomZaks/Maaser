// Extended types for better-auth to include our custom fields
import type { Role } from "@prisma/client";

declare module "better-auth" {
  interface User {
    role: Role;
  }

  interface Session {
    user: User & {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      role: Role;
      image?: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
  }
}

export {};
