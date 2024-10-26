import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";

// Set the path to the FFmpeg executable
ffmpeg.setFfmpegPath(ffmpegStatic);

// Define an asynchronous function to convert an MP4 file to HLS format
const convertToHLS = async () => {
  // Define the target resolutions, video bitrates, and audio bitrates for HLS renditions
  const resolutions = [
    {
      resolution: "320x180",
      videoBitrate: "500k",
      audioBitrate: "64k",
    },
    {
      resolution: "854x480",
      videoBitrate: "1000k",
      audioBitrate: "128k",
    },
    {
      resolution: "1280x720",
      videoBitrate: "2500k",
      audioBitrate: "192k",
    },
  ];

  // Define the source MP4 file name
  const mp4FileName = "bapu.mp4";
  // Initialize an array to store variant playlist information
  const variantPlaylists = [];

  // Loop over each resolution setting
  for (const { resolution, videoBitrate, audioBitrate } of resolutions) {
    console.log(`HLS conversion starting for ${resolution}`);

    // Generate the output playlist and segment file names for each resolution
    const outputFileName = `${mp4FileName.replace(
      ".",
      "_"
    )}_${resolution}.m3u8`;
    const segmentFileName = `${mp4FileName.replace(
      ".",
      "_"
    )}_${resolution}_%03d.ts`;

    // Process each video rendition asynchronously
    await new Promise((resolve, reject) => {
      // Use FFmpeg to create an HLS rendition for the current resolution
      ffmpeg("bapu.mp4")
        .outputOptions([
          `-c:v h264`, // Set video codec to h264
          `-b:v ${videoBitrate}`, // Set video bitrate
          `-c:a aac`, // Set audio codec to aac
          `-b:a ${audioBitrate}`, // Set audio bitrate
          `-vf scale=${resolution}`, // Scale video to target resolution
          `-f hls`, // Specify output format as HLS
          `-hls_time 10`, // Set HLS segment duration to 10 seconds
          `-hls_list_size 0`, // Disable list size limit for HLS
          `-hls_segment_filename output/${segmentFileName}`, // Set segment filename pattern
        ])
        .output(`output/${outputFileName}`) // Define output playlist file path
        .on("end", () => resolve()) // Resolve the promise on success
        .on("error", (err) => reject(err)) // Reject the promise on error
        .run();
    });

    // Store the generated resolution and output playlist name in the variant playlist
    const variantPlaylist = {
      resolution,
      outputFileName,
    };
    variantPlaylists.push(variantPlaylist);

    console.log(`HLS conversion done for ${resolution}`);
  }

  // Generate a master playlist that links to all variant playlists
  console.log(`HLS master m3u8 playlist generating`);
  let masterPlaylist = variantPlaylists
    .map((variantPlaylist) => {
      const { resolution, outputFileName } = variantPlaylist;

      // Set bandwidth estimates based on resolution
      const bandwidth =
        resolution === "320x180"
          ? 676800
          : resolution === "854x480"
          ? 1353600
          : 3230400;

      // Create a line entry for each variant in the master playlist
      return `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}\n${outputFileName}`;
    })
    .join("\n");

  // Prepend the master playlist header
  masterPlaylist = `#EXTM3U\n` + masterPlaylist;

  // Define the master playlist file name and write it to the output directory
  const masterPlaylistFileName = `${mp4FileName.replace(".", "_")}_master.m3u8`;
  const masterPlaylistPath = `output/${masterPlaylistFileName}`;
  fs.writeFileSync(masterPlaylistPath, masterPlaylist);

  console.log(`HLS master m3u8 playlist generated`);
};

// Export the HLS conversion function for external use
export default convertToHLS;
