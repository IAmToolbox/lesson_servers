// Queries that run against the posts table

import { db } from "../index.js";
import { NewChirp, chirps } from "../schema.js";

// Query the addition of a new chirp

export async function createNewChirp(chirp: NewChirp) {
    const [result] = await db.insert(chirps).values(chirp).returning();
    return result;
}
