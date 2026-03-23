// Queries that will run against the users table in the database

import { db } from "../index.js";
import { NewUser, users } from "../schema.js";
import { eq } from "drizzle-orm";

export type UserResponse = Omit<NewUser, "hashedPassword">;

// Query the creation of a new user
export async function createUser(user: NewUser): Promise<UserResponse> {
    const [result] = await db.insert(users).values(user).onConflictDoNothing().returning();
    return {
        id: result.id,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        email: result.email,
        isChirpyRed: result.isChirpyRed,
    };
}

// Query updating an existing user
export async function updateUser(id: string, email: string, hashedPassword: string): Promise<UserResponse> {
    const [result] = await db.update(users).set({ updatedAt: new Date(), email: email, hashedPassword: hashedPassword }).where(eq(users.id, id)).returning();
    return {
        id: result.id,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        email: result.email,
        isChirpyRed: result.isChirpyRed,
    };
}

// Query searching for a user by their email
export async function getUserByEmail(email: string) {
    const [result] = await db.select().from(users).where(eq(users.email, email));
    return result;
}

// Query the upgrade to Chirpy Red
export async function upgradeChirpyRed(id: string) {
    const [result] = await db.update(users).set({ updatedAt: new Date(), isChirpyRed: true }).where(eq(users.id, id)).returning();
    return result;
}

// Query the deletion of the users table
export async function resetUsers() {
    await db.delete(users);
}
