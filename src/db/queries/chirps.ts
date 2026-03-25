// Queries that run against the posts table

import { db } from "../index.js";
import { NewChirp, chirps } from "../schema.js";
import { eq, asc, desc } from "drizzle-orm";

// Query the addition of a new chirp
export async function createNewChirp(chirp: NewChirp) {
    const [result] = await db.insert(chirps).values(chirp).returning();
    return result;
}

// Query retrieval of all chirps
export async function getAllChirps(sort?: string) {
    if (sort === "desc") {
        const result = await db.select().from(chirps).orderBy(desc(chirps.createdAt));
        return result;
    } else {
        const result = await db.select().from(chirps).orderBy(asc(chirps.createdAt));
        return result;
    }

}

// Query retrieval of all chirps by a single author
export async function getAllChirpsFromAuthor(authorId: string, sort?: string) {
    if (sort === "desc") {
        const result = await db.select().from(chirps).where(eq(chirps.userId, authorId)).orderBy(desc(chirps.createdAt));
        return result;
    } else {
        const result = await db.select().from(chirps).where(eq(chirps.userId, authorId)).orderBy(asc(chirps.createdAt));
        return result;
    }

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
