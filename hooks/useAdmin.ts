import { useState } from "react";
import { isAdmin, getUserRole } from "@/lib/auth-utils";
import { useSession } from "@/lib/auth-client";

/**
 * Hook for admin role management and checks
 */
export function useAdmin() {
  const { data: session, isPending } = useSession();
  const [isPromoting, setIsPromoting] = useState(false);

  const userRole = getUserRole(session);
  const userIsAdmin = isAdmin(userRole);

  /**
   * Promote a user to admin role
   */
  const promoteToAdmin = async (userId: string) => {
    if (!userIsAdmin) {
      throw new Error("Only admins can promote users");
    }

    setIsPromoting(true);
    try {
      const response = await fetch("/api/admin/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to promote user");
      }

      return await response.json();
    } catch (error) {
      console.error("Error promoting user:", error);
      throw error;
    } finally {
      setIsPromoting(false);
    }
  };

  /**
   * Demote an admin to regular user role
   */
  const demoteToUser = async (userId: string) => {
    if (!userIsAdmin) {
      throw new Error("Only admins can demote users");
    }

    setIsPromoting(true);
    try {
      const response = await fetch("/api/admin/demote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to demote user");
      }

      return await response.json();
    } catch (error) {
      console.error("Error demoting user:", error);
      throw error;
    } finally {
      setIsPromoting(false);
    }
  };

  return {
    isAdmin: userIsAdmin,
    userRole,
    session,
    isPending,
    isPromoting,
    promoteToAdmin,
    demoteToUser,
  };
}

/**
 * Simple hook to check if current user is admin
 */
export function useIsAdmin() {
  const { data: session } = useSession();
  return isAdmin(getUserRole(session));
}
