import { getDb } from "../lib/db/client";
import { users, userRoles } from "../lib/db/schema";
import { hashPassword } from "../lib/auth/crypto";
import { randomUUID } from "crypto";

async function createAdminUser() {
  const db = getDb();

  const adminId = randomUUID();
  const email = "admin@example.com";
  const password = "admin-password";
  const displayName = "Admin User";

  const passwordHash = await hashPassword(password);

  try {
    // Create admin user
    await db.insert(users).values({
      id: adminId,
      email,
      passwordHash,
      displayName,
    });

    // Assign admin role
    await db.insert(userRoles).values({
      id: randomUUID(),
      userId: adminId,
      role: "admin",
    });

    console.log("✓ Admin user created successfully!");
    console.log(`\nEmail: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`\n⚠️  Change this password immediately after first login!`);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("duplicate key")
    ) {
      console.log("✓ Admin user already exists");
    } else {
      console.error("Error creating admin user:", error);
      process.exit(1);
    }
  }
}

createAdminUser().then(() => {
  console.log("\nDone!");
  process.exit(0);
});
