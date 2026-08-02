import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { schoolMemberships, schools, students, users } from "./schema";

/**
 * Deterministic development seed.
 *
 * Creates TWO schools deliberately. A single-tenant dataset hides every
 * isolation bug — cross-tenant leakage is invisible when there is nothing to
 * leak into. See docs/06-multi-tenancy.md.
 */
async function main(): Promise<void> {
  const url =
    process.env["DATABASE_MIGRATION_URL"] ?? process.env["DATABASE_URL"];

  if (!url) {
    throw new Error("Set DATABASE_MIGRATION_URL or DATABASE_URL.");
  }

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  try {
    const password = await hash("Password123!", {
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    for (const [slug, name] of [
      ["riverside-high", "Riverside High School"],
      ["oakwood-academy", "Oakwood Academy"],
    ] as const) {
      const existing = await db
        .select()
        .from(schools)
        .where(eq(schools.slug, slug))
        .limit(1);

      const school =
        existing[0] ??
        (await db.insert(schools).values({ slug, name }).returning())[0];

      if (!school) throw new Error(`Failed to seed school ${slug}`);

      const email = `admin@${slug}.test`;
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      const user =
        existingUser[0] ??
        (
          await db
            .insert(users)
            .values({
              email,
              passwordHash: password,
              firstName: "Admin",
              lastName: name.split(" ")[0] ?? "User",
              status: "ACTIVE",
            })
            .returning()
        )[0];

      if (!user) throw new Error(`Failed to seed user ${email}`);

      await db
        .insert(schoolMemberships)
        .values({ schoolId: school.id, userId: user.id, role: "ADMIN" })
        .onConflictDoNothing();

      await db
        .insert(students)
        .values({
          schoolId: school.id,
          admissionNumber: "ADM-001",
          firstName: "Sample",
          lastName: "Student",
        })
        .onConflictDoNothing();

      console.log(`seeded ${name} — login ${email} / Password123!`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
