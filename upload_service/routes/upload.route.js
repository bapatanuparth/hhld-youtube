import express from "express";
import uploadFileToS3 from "../controllers/upload.controller.js";

const router = express.Router();
router.post("/", uploadFileToS3);

export default router;
