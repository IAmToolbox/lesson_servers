// Queries that run against the posts table

import { db } from "../index.js";
import { NewChirp, chirps } from "../schema.js";
import { eq, asc } from "drizzle-orm";

// Query the addition of a new chirp
export async function createNewChirp(chirp: NewChirp) {
    const [result] = await db.insert(chirps).values(chirp).returning();
    return result;
}

// Query retrieval of all chirps in ascending order on when they were created
export async function getAllChirps() {
    const result = await db.select().from(chirps).orderBy(asc(chirps.createdAt));
    return result;
}

// Query retrieval of a single chirp by ID
export async function getChirpById(id: string) {
    const [result] = await db.select().from(chirps).where(eq(chirps.id, id));
    return result;
}

// Query the deletion of a single chirp
export async function deleteChirp(id: string) {
    await db.delete(chirps).where(eq(chirps.id, id));
}
