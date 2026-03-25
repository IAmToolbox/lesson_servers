// Learning servers on Boot.dev oh me oh my
import express from "express";
import { config } from "../config.js";
import { hashPassword, checkPasswordHash, makeJWT, validateJWT, getBearerToken, getAPIKey, makeRefreshToken } from "./auth.js";
import { createUser, updateUser, getUserByEmail, upgradeChirpyRed, resetUsers } from "../db/queries/users.js";
import { createNewChirp, getAllChirps, getAllChirpsFromAuthor, getChirpById, deleteChirp } from "../db/queries/chirps.js";
import { createRefreshToken, getRefreshTokenById, revokeToken } from "../db/queries/refresh_tokens.js";
// Custom error definitions go here
class BadRequestError extends Error {
    constructor(message) {
        super(message);
    }
}
class UnauthorizedError extends Error {
    constructor(message) {
        super(message);
    }
}
class ForbiddenError extends Error {
    constructor(message) {
        super(message);
    }
}
class NotFoundError extends Error {
    constructor(message) {
        super(message);
    }
}
const app = express();
const PORT = 8080;
app.use(express.json());
app.use(middlewareLogResponses);
app.get("/api/healthz", (req, res) => {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send("OK");
});
app.post("/api/chirps", handlerAddNewChirp);
app.get("/api/chirps", handlerGetAllChirps);
app.get("/api/chirps/:chirpId", handlerGetChirpById);
app.delete("/api/chirps/:chirpId", handlerDeleteChirp);
app.post("/api/users", handlerAddUser);
app.put("/api/users", handlerUpdateUser);
app.post("/api/polka/webhooks", handlerUpgradeChirpyRed);
app.post("/api/login", handlerLogin);
app.post("/api/refresh", handlerRefreshUser);
app.post("/api/revoke", handlerRevokeToken);
app.get("/admin/metrics", middlewareMetricsLog);
app.post("/admin/reset", middlewareMetricsReset);
app.use("/app", middlewareMetricsInc, express.static("./src/app"));
app.use(errorHandler);
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
function middlewareLogResponses(req, res, next) {
    res.on("finish", () => {
        const status = res.statusCode;
        if (status < 200 && status >= 300) {
            console.log(`[NON-OK] ${req.method} ${req.originalUrl} - Status: ${status}`);
        }
    });
    next();
}
function middlewareMetricsInc(req, res, next) {
    config.fileserverHits += 1;
    next();
}
function middlewareMetricsLog(req, res, next) {
    //res.send(`Hits: ${config.fileserverHits}`);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(`<h1>Welcome, Chirpy Admin</h1>\n<p>Chirpy has been visited ${config.fileserverHits} times!</p>`);
    next();
}
async function middlewareMetricsReset(req, res, next) {
    try {
        if (config.platform !== "dev") {
            throw new ForbiddenError("Endpoint only available for development environment");
        }
        config.fileserverHits = 0;
        await resetUsers();
        res.send("Hits and User Database Reset");
    }
    catch (err) {
        next(err);
    }
}
async function handlerAddUser(req, res, next) {
    const parsedBody = req.body; // Will receive an email and a password.
    try {
        // MAKE SURE TO ALWAYS HASH THE PASSWORD BEFORE ADDING THE NEW USER
        const hashedPassword = await hashPassword(parsedBody.password);
        const createdUser = await createUser({ email: parsedBody.email, hashedPassword: hashedPassword });
        res.status(201).json(createdUser);
    }
    catch (err) {
        next(err);
    }
}
async function handlerUpdateUser(req, res, next) {
    const parsedBody = req.body;
    try {
        const userId = validateAuthHeader(req);
        const hashedPassword = await hashPassword(parsedBody.password);
        const updatedUser = await updateUser(userId, parsedBody.email, hashedPassword);
        res.status(200).json(updatedUser);
    }
    catch (err) {
        next(err);
    }
}
async function handlerUpgradeChirpyRed(req, res, next) {
    const parsedBody = req.body; // Will receive a webhook request, with an event and some data
    try {
        if (parsedBody.event !== "user.upgraded") {
            res.status(204).end();
        }
        let APIKey = "";
        try {
            APIKey = getAPIKey(req);
        }
        catch (err) {
            throw new UnauthorizedError("Upgrade unsuccessful");
        }
        if (APIKey !== config.polkaKey) {
            throw new UnauthorizedError("Upgrade unsuccessful");
        }
        const upgradedUser = await upgradeChirpyRed(parsedBody.data.userId);
        if (!upgradedUser) {
            throw new NotFoundError("User not found");
        }
        res.status(204).end();
    }
    catch (err) {
        next(err);
    }
}
async function handlerLogin(req, res, next) {
    const parsedBody = req.body; // Will receive an email and a password
    try {
        const user = await getUserByEmail(parsedBody.email);
        if (user === undefined) {
            throw new UnauthorizedError("Incorrect email or password");
        }
        if (await checkPasswordHash(parsedBody.password, user.hashedPassword)) {
            const accessExpiresIn = 3600;
            const refreshExpiresIn = 5184000 * 1000; // This should be 60 days
            const accessToken = makeJWT(user.id, accessExpiresIn, config.secret);
            const refreshToken = await createRefreshToken({
                token: makeRefreshToken(),
                userId: user.id,
                expiresAt: new Date(Date.now() + refreshExpiresIn), // If I set it up right the constructor should get a UNIX epoch millisecond representation of the date 60 days from now
                revokedAt: null, // Can't revoke a token we *just* created
            });
            const userResponse = {
                id: user.id,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                email: user.email,
                isChirpyRed: user.isChirpyRed,
                token: accessToken,
                refreshToken: refreshToken.token,
            };
            res.status(200).json(userResponse);
        }
        else {
            throw new UnauthorizedError("Incorrect email or password");
        }
    }
    catch (err) {
        next(err);
    }
}
async function handlerRefreshUser(req, res, next) {
    // Will not receive a body, but will have an Authorization header
    try {
        const refreshTokenId = getBearerToken(req);
        const refreshToken = await getRefreshTokenById(refreshTokenId);
        if (refreshToken === undefined || refreshToken.expiresAt.getTime() < Date.now() || refreshToken.revokedAt !== null) {
            throw new UnauthorizedError("Session has expired or has been revoked. Please log in again");
        }
        const accessExpiresIn = 3600;
        if (typeof refreshToken.userId === "string") {
            const accessToken = makeJWT(refreshToken.userId, accessExpiresIn, config.secret);
            res.status(200).json({
                token: accessToken,
            });
        }
        else {
            throw new NotFoundError("User not found");
        }
    }
    catch (err) {
        next(err);
    }
}
async function handlerRevokeToken(req, res, next) {
    // Will not receive a body, but will have an Authorization header
    try {
        const refreshTokenId = getBearerToken(req);
        await revokeToken(refreshTokenId);
        res.status(204).end();
    }
    catch (err) {
        next(err);
    }
}
async function handlerAddNewChirp(req, res, next) {
    const parsedBody = req.body; // Will receive a chirp. The Authorization header will have a bearer token. Extract the user ID from that
    try {
        const userId = validateAuthHeader(req);
        // Validation logic
        if (parsedBody.body.length > 140) {
            throw new BadRequestError("Chirp is too long. Max length is 140");
        }
        // Because this is a good Christian Twitter ripoff here's the logic to remove the nasty words
        const splitChirp = parsedBody.body.split(" ");
        const lowerChirp = splitChirp.map((word) => word.toLowerCase());
        if (lowerChirp.includes("kerfuffle") || lowerChirp.includes("sharbert") || lowerChirp.includes("fornax")) {
            const nastyIndices = [lowerChirp.indexOf("kerfuffle"), lowerChirp.indexOf("sharbert"), lowerChirp.indexOf("fornax")];
            for (let i of nastyIndices) {
                if (i === -1) {
                    continue;
                }
                splitChirp[i] = "****";
            }
        }
        const cleanChirp = splitChirp.join(" ");
        const createdChirp = await createNewChirp({ body: cleanChirp, userId: userId });
        res.status(201).json(createdChirp);
        next();
    }
    catch (err) {
        next(err);
    }
}
async function handlerGetAllChirps(req, res, next) {
    try {
        const authorId = validateAuthorIdQuery(req); // Query may or may not be there
        const sort = validateSortQuery(req); // Query may or may not also be there this is so complex man
        if (authorId) {
            const authorChirps = await getAllChirpsFromAuthor(authorId, sort);
            res.status(200).json(authorChirps);
        }
        else {
            const chirps = await getAllChirps(sort);
            res.status(200).json(chirps);
        }
    }
    catch (err) {
        next(err);
    }
}
async function handlerGetChirpById(req, res, next) {
    const { chirpId } = req.params;
    // Explicit type guard needed
    if (typeof chirpId !== "string") {
        throw new BadRequestError("Invalid chirp ID");
    }
    try {
        const chirp = await getChirpById(chirpId);
        if (!chirp) {
            throw new NotFoundError("Chirp not found");
        }
        res.status(200).json(chirp);
    }
    catch (err) {
        next(err);
    }
}
async function handlerDeleteChirp(req, res, next) {
    const { chirpId } = req.params;
    // Same type guard as before
    if (typeof chirpId !== "string") {
        throw new BadRequestError("Invalid chirp ID");
    }
    try {
        const userId = await validateAuthHeader(req);
        const chirp = await getChirpById(chirpId);
        if (!chirp) {
            throw new NotFoundError("Chirp not found");
        }
        if (chirp.userId !== userId) {
            throw new ForbiddenError("Attempted to delete someone else's chirp");
        }
        await deleteChirp(chirpId);
        res.status(204).end();
    }
    catch (err) {
        next(err);
    }
}
function errorHandler(err, req, res, next) {
    if (err instanceof BadRequestError) {
        console.log(err);
        res.status(400).json({
            error: err.message
        });
    }
    if (err instanceof UnauthorizedError) {
        console.log(err);
        res.status(401).json({
            error: err.message
        });
    }
    if (err instanceof ForbiddenError) {
        console.log(err);
        res.status(403).json({
            error: err.message
        });
    }
    if (err instanceof NotFoundError) {
        console.log(err);
        res.status(404).json({
            error: err.message
        });
    }
}
// Quick helper functions
function validateAuthHeader(req) {
    try {
        const token = getBearerToken(req);
        return validateJWT(token, config.secret);
    }
    catch (err) {
        console.log(err);
        throw new UnauthorizedError("Session expired. Please log in again");
    }
}
function validateAuthorIdQuery(req) {
    const rawQuery = req.query.authorId;
    if (typeof rawQuery === "string") {
        return rawQuery;
    }
    else {
        return undefined;
    }
}
function validateSortQuery(req) {
    const rawQuery = req.query.sort;
    if (typeof rawQuery === "string") {
        return rawQuery;
    }
    else {
        return undefined;
    }
}
