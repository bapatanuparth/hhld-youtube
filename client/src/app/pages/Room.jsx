"use client";

import React from "react";
import dynamic from "next/dynamic";
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const Room = () => {
  return (
    <div>
      <ReactPlayer
        url="https://www.youtube.com/watch?v=un6ZyFkqFKo&t=184s"
        width="720px"
        height="540px"
        controls={true}
      />
    </div>
  );
};

export default Room;
