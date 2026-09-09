import express from "express";
import { apiRouter } from "../server/apiRouter.js";

const app = express();
app.use(express.json({ limit: "5mb" }));

// Mount all API endpoints
app.use(apiRouter);

export default app;
