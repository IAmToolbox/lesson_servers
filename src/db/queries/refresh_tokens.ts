// Queries that run on the refresh_tokens table

import { db } from "../index.js";
import { NewRefreshToken, refreshTokens } from "../schema.js";
import { eq } from "drizzle-orm";

// Query the creation of a new refresh token
export async function createRefreshToken(refreshToken: NewRefreshToken) {
    const [result] = await db.insert(refreshTokens).values(refreshToken).returning();
    return result;
}

// Query the lookup of a token by ID
export async function getRefreshTokenById(id: string) {
    const [result] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, id));
    return result;
}

// Revoke a token by updating its records
export async function revokeToken(id: string) {
    await db.update(refreshTokens).set({ updatedAt: new Date(), revokedAt: new Date() }).where(eq(refreshTokens.token, id));
}
