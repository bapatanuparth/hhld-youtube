import express from "express";
import multer from "multer";
import {
  initializeUpload,
  uploadChunk,
  completeUpload,
} from "../controllers/multipartupload.controller.js";
const upload = multer();

const router = express.Router();

// Route for initializing upload
//no file uploaded but you need to access content from the body, use upload.none()
router.post("/initialize", upload.none(), initializeUpload);

// Route for uploading individual chunks
router.post("/", upload.single("chunk"), uploadChunk);

// Route for completing the upload
router.post("/complete", completeUpload);

export default router;
