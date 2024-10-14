"use client";

import React from "react";
import dynamic from "next/dynamic";
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });
import UploadForm from "../components/UploadForm";
const Room = () => {
  return (
    <div>
      <UploadForm></UploadForm>
    </div>
  );
};

export default Room;
