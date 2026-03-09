// Learning servers on Boot.dev oh me oh my
import express from "express";
import { config } from "../config.js";
const app = express();
const PORT = 8080;
app.get("/healthz", (req, res) => {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send("OK");
});
app.get("/metrics", middlewareMetricsLog);
app.get("/reset", middlewareMetricsReset);
app.use("/app", middlewareMetricsInc, express.static("./src/app"));
app.use(middlewareLogResponses);
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
    res.send(`Hits: ${config.fileserverHits}`);
    next();
}
function middlewareMetricsReset(req, res, next) {
    config.fileserverHits = 0;
    res.send("Hits Reset");
    next();
}
