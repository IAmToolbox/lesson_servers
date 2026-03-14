// Learning servers on Boot.dev oh me oh my

import express from "express";
import { Request, Response } from "express";
import { config } from "../config.js";
import { createUser, resetUsers } from "../db/queries/users.js"
import { createNewChirp, getAllChirps, getChirpById } from "../db/queries/chirps.js";

type Middleware = (req: Request, res: Response, next: Function) => void;

// Custom error definitions go here

class BadRequestError extends Error {
    constructor(message: string) {
        super(message);
    }
}

class UnauthorizedError extends Error {
    constructor(message: string) {
        super(message);
    }
}

class ForbiddenError extends Error {
    constructor(message: string) {
        super(message);
    }
}

class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
    }
}

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(middlewareLogResponses);
app.get("/api/healthz", (req: Request, res: Response) => {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send("OK");
});
app.post("/api/chirps", handlerAddNewChirp);
app.get("/api/chirps", handlerGetAllChirps);
app.get("/api/chirps/:chirpId", handlerGetChirpById);
app.post("/api/users", handlerAddUser);
app.get("/admin/metrics", middlewareMetricsLog);
app.post("/admin/reset", middlewareMetricsReset);
app.use("/app", middlewareMetricsInc, express.static("./src/app"));
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

function middlewareLogResponses(req: Request, res: Response, next: Function) {
    res.on("finish", () => {
        const status = res.statusCode
        if (status < 200 && status >= 300) {
            console.log(`[NON-OK] ${req.method} ${req.originalUrl} - Status: ${status}`);
        }
    });
    next();
}

function middlewareMetricsInc(req: Request, res: Response, next: Function) {
    config.fileserverHits += 1;
    next();
}

function middlewareMetricsLog(req: Request, res: Response, next: Function) {
    //res.send(`Hits: ${config.fileserverHits}`);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(`<h1>Welcome, Chirpy Admin</h1>\n<p>Chirpy has been visited ${config.fileserverHits} times!</p>`);
    next();
}

async function middlewareMetricsReset(req: Request, res: Response, next: Function) {
    try {
        if (config.platform !== "dev") {
            throw new ForbiddenError("Endpoint only available for development environment");
        }
        config.fileserverHits = 0;
        await resetUsers();
        res.send("Hits and User Database Reset");
        next();
    } catch (err) {
        next(err);
    }
}

async function handlerAddUser(req: Request, res: Response, next: Function) {
    const parsedBody = req.body; // Will receive an email
    const createdUser = await createUser({ email: parsedBody.email });
    res.status(201).json(createdUser);
}

async function handlerAddNewChirp(req: Request, res: Response, next: Function) {
    const parsedBody = req.body; // Will receive a chirp and the user ID of the poster
    try {
        // Validation logic
        if (parsedBody.body.length > 140) {
            throw new BadRequestError("Chirp is too long. Max length is 140");
        }

        // Because this is a good Christian Twitter ripoff here's the logic to remove the nasty words
        const splitChirp = parsedBody.body.split(" ");
        const lowerChirp = splitChirp.map((word: string) => word.toLowerCase());
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

        const createdChirp = await createNewChirp({ body: cleanChirp, userId: parsedBody.userId });
        res.status(201).json(createdChirp);
        next();
    } catch (err) {
        next(err);
    }

}

async function handlerGetAllChirps(req: Request, res: Response, next: Function) {
    try {
        const chirps = await getAllChirps();
        res.status(200).json(chirps);
        next();
    } catch (err) {
        next(err);
    }
}

async function handlerGetChirpById(req: Request, res: Response, next: Function) {
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
    } catch (err) {
        next(err);
    }
}

function errorHandler(err: Error, req: Request, res: Response, next: Function) {
    if (err instanceof BadRequestError) {
        console.log(err);
        res.status(400).json({
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
