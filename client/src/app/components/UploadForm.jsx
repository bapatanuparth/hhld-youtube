"use client";
import React, { useState } from "react";
import axios from "axios";

const UploadForm = () => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    try {
      //take filename, create form data, make the initialize multipartupload request
      const formData = new FormData();
      formData.append("filename", selectedFile.name);
      const initializeRes = await axios.post(
        "http://localhost:8081/upload/initialize",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const { uploadId } = initializeRes.data; //save the uploadID, very important
      console.log("Upload id is ", uploadId);

      const chunkSize = 5 * 1024 * 1024; // 5 MB chunks
      const totalChunks = Math.ceil(selectedFile.size / chunkSize);

      let start = 0;
      const uploadPromises = [];
      //create chunks of given chunkSize of the entire file
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunk = selectedFile.slice(start, start + chunkSize);
        start += chunkSize;
        const chunkFormData = new FormData();
        chunkFormData.append("filename", selectedFile.name);
        chunkFormData.append("chunk", chunk);
        chunkFormData.append("totalChunks", totalChunks);
        chunkFormData.append("chunkIndex", chunkIndex);
        chunkFormData.append("uploadId", uploadId);

        const uploadPromise = axios.post(
          "http://localhost:8081/upload",
          chunkFormData,
          {
            //call the second step of the multipart upload, with each chunk
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        uploadPromises.push(uploadPromise);
      }

      await Promise.all(uploadPromises);
      //complete the multi-part upload
      const completeRes = await axios.post(
        "http://localhost:8081/upload/complete",
        {
          filename: selectedFile.name,
          totalChunks: totalChunks,
          uploadId: uploadId,
        }
      );

      console.log(completeRes.data);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <div className="m-10">
      <form encType="multipart/form-data">
        <input type="file" name="file" onChange={handleFileChange} />
        <button
          type="button"
          onClick={handleUpload}
          className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2"
        >
          Upload
        </button>
      </form>
    </div>
  );
};

export default UploadForm;
