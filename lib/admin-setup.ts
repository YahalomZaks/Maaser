import { prismaClient } from "@/lib/prisma";

/**
 * Set up first admin user based on environment variable
 * This will upgrade the first user or a specific email to ADMIN role
 */
export async function setupFirstAdmin() {
  try {
    const adminEmail = process.env.FIRST_ADMIN_EMAIL;

    if (!adminEmail) {
      console.warn("No FIRST_ADMIN_EMAIL environment variable set");
      return null;
    }

    // Check if user with this email exists
    const user = await prismaClient.user.findUnique({
      where: { email: adminEmail },
    });

    if (!user) {
      console.warn(`User with email ${adminEmail} not found`);
      return null;
    }

    // If user is already admin, no need to update
    if (user.role === "ADMIN") {
      return user;
    }

    // Upgrade user to admin
    const updatedUser = await prismaClient.user.update({
      where: { email: adminEmail },
      data: { role: "ADMIN" },
    });
    return updatedUser;
  } catch (error) {
    console.error("Error setting up first admin:", error);
    return null;
  }
}

/**
 * Automatically set the first registered user as admin
 * This runs only if no admin exists yet
 */
export async function setFirstUserAsAdmin() {
  try {
    // Check if any admin exists
    const existingAdmin = await prismaClient.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      console.warn("Admin already exists, skipping auto-admin setup");
      return existingAdmin;
    }

    // Get the first user (oldest by creation date)
    const firstUser = await prismaClient.user.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!firstUser) {
      console.warn("No users found");
      return null;
    }

    // Upgrade first user to admin
    const updatedUser = await prismaClient.user.update({
      where: { id: firstUser.id },
      data: { role: "ADMIN" },
    });

    return updatedUser;
  } catch (error) {
    console.error("Error setting first user as admin:", error);
    return null;
  }
}

/**
 * Get current admin users
 */
export async function getAdminUsers() {
  try {
    const admins = await prismaClient.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    return admins;
  } catch (error) {
    console.error("Error getting admin users:", error);
    return [];
  }
}

/**
 * Promote user to admin role
 */
export async function promoteUserToAdmin(userId: string) {
  try {
    const updatedUser = await prismaClient.user.update({
      where: { id: userId },
      data: { role: "ADMIN" },
    });
    return updatedUser;
  } catch (error) {
    console.error("Error promoting user to admin:", error);
    return null;
  }
}

/**
 * Demote admin to regular user role
 */
export async function demoteAdminToUser(userId: string) {
  try {
    // Make sure we're not demoting the last admin
    const adminCount = await prismaClient.user.count({
      where: { role: "ADMIN" },
    });

    if (adminCount <= 1) {
      throw new Error("Cannot demote the last admin user");
    }

    const updatedUser = await prismaClient.user.update({
      where: { id: userId },
      data: { role: "USER" },
    });
    return updatedUser;
  } catch (error) {
    console.error("Error demoting admin to user:", error);
    return null;
  }
}
