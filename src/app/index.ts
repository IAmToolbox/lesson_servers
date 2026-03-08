// Learning servers on Boot.dev oh me oh my

import express from "express";
import { Request, Response } from "express";

const app = express();
const PORT = 8080;


app.get("/healthz", (req: Request, res: Response) => {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send("OK");
});
app.use("/app", express.static("./src/app"));

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
