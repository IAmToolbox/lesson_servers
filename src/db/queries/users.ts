// Queries that will run against the users table in the database

import { db } from "../index.js";
import { NewUser, users } from "../schema.js";

// Query the creation of a new user
export async function createUser(user: NewUser) {
    const [result] = await db.insert(users).values(user).onConflictDoNothing().returning();
    return result;
}

// Query the deletion of the users table
export async function resetUsers() {
    await db.delete(users);
}
