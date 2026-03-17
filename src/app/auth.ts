// Functions dedicated to authenticating users via their passwords

import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

type Payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export async function hashPassword(password: string): Promise<string> {
    try {
        const hash = await argon2.hash(password);
        return hash;
    } catch (err) {
        console.log("Couldn't hash password");
        throw(err);
    }
}

export async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
    try {
        if (await argon2.verify(hash, password)) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        console.log("Couldn't verify password hash");
        throw(err);
    }
}

export function makeJWT(userId: string, expiresIn: number, secret: string): string {
    const payload: Payload = {
        iss: "chirpy",
        sub: userId,
        iat: Math.floor(Date.now()/1000),
        exp: (Math.floor(Date.now()/1000)) + expiresIn,
    }
    return jwt.sign(payload, secret);
}

export function validateJWT(tokenString: string, secret: string): string {
    try {
        const decoded = jwt.verify(tokenString, secret);
        return decoded.sub;
    } catch (err) {
        throw new Error("JWT was not validated");
    }
}
