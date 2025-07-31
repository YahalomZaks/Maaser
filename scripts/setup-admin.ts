/**
 * Setup script for first admin user
 * Run this script to automatically set up the first admin user
 */

import {
  setupFirstAdmin,
  setFirstUserAsAdmin,
  getAdminUsers,
} from "../lib/admin-setup";

async function main() {
  console.log("🔧 Setting up first admin user...");

  try {
    // Try to set up admin from environment variable first
    let admin = await setupFirstAdmin();

    // If no specific email provided, set first user as admin
    if (!admin) {
      admin = await setFirstUserAsAdmin();
    }

    // Show current admin users
    const admins = await getAdminUsers();

    if (admins.length > 0) {
      console.log("\n✅ Current admin users:");
      admins.forEach((admin, index) => {
        console.log(
          `${index + 1}. ${admin.email} (${
            admin.name
          }) - Created: ${admin.createdAt.toLocaleDateString()}`
        );
      });
    } else {
      console.log("\n❌ No admin users found. Please register a user first.");
    }
  } catch (error) {
    console.error("❌ Error setting up admin:", error);
  }
}

// Run the script
main()
  .then(() => {
    console.log("\n🎉 Admin setup completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
