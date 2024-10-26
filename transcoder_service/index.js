import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import KafkaConfig from "../upload_service/kafka/kafka.js";
import convertToHLS from "./hls/transcode.js";

dotenv.config();
const port = process.env.PORT || 8081;

const app = express();
app.use(
  cors({
    allowedHeaders: ["*"],
    origin: "*",
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("HHLD Youtube transcoder");
});

app.get("/transcode", (req, res) => {
  convertToHLS();
  res.send("transcoded");
});

// const kafkaconfig = new KafkaConfig();
// kafkaconfig.consume("transcode", (value) => {
//   console.log("got new data from kafka:", value);
// });

app.listen(port, () => {
  console.log(`Transcoder Server is listening at http://localhost:${port}`);
});
