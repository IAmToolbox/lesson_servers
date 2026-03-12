// Learning servers on Boot.dev oh me oh my
import express from "express";
import { config } from "../config.js";
import { createUser, resetUsers } from "../db/queries/users.js";
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
app.post("/api/validate_chirp", handlerValidateChirp);
app.post("/api/users", handlerAddUser);
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
        if (status !== 200) {
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
        next();
    }
    catch (err) {
        next(err);
    }
}
function handlerValidateChirp(req, res) {
    //try {
    const parsedBody = req.body;
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
    const okResponse = {
        cleanedBody: cleanChirp
    };
    res.status(200).json(okResponse);
    //} catch (err) {
    /*const errResponse = {
        error: "Chirp is too long"
    };
    res.status(400).json(errResponse);*/
    //}
}
async function handlerAddUser(req, res, next) {
    const parsedBody = req.body; // Will receive an email
    const createdUser = await createUser({ email: parsedBody.email });
    res.status(201).json(createdUser);
}
function errorHandler(err, req, res, next) {
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
}
