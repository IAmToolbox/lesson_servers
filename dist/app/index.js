// Learning servers on Boot.dev oh me oh my
import express from "express";
import { config } from "../config.js";
const app = express();
const PORT = 8080;
app.use(express.json());
app.use(middlewareLogResponses);
app.get("/api/healthz", (req, res) => {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send("OK");
});
app.post("/api/validate_chirp", handlerValidateChirp);
app.get("/admin/metrics", middlewareMetricsLog);
app.post("/admin/reset", middlewareMetricsReset);
app.use("/app", middlewareMetricsInc, express.static("./src/app"));
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
function middlewareMetricsReset(req, res, next) {
    config.fileserverHits = 0;
    res.send("Hits Reset");
    next();
}
function handlerValidateChirp(req, res) {
    try {
        const parsedBody = req.body;
        if (parsedBody.body.length > 140) {
            throw new Error("Chirp is too long");
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
    }
    catch (err) {
        const errResponse = {
            error: "Chirp is too long"
        };
        res.status(400).json(errResponse);
    }
}
