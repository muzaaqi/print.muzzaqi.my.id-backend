import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ServiceRoute from "./routes/ServiceRoute.js";
import TransactionRoute from "./routes/TransactionRoute.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(ServiceRoute);
app.use(TransactionRoute);

app.listen(process.env.APP_PORT, () => {
  console.log(`Server is running on port ${process.env.APP_PORT}`);
});