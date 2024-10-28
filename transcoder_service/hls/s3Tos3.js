import dotenv from "dotenv";
import AWS from "aws-sdk";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

// Set the FFmpeg path using ffmpeg-static
ffmpeg.setFfmpegPath(ffmpegStatic);

// Load environment variables from .env file
dotenv.config();

// Initialize the AWS S3 instance using credentials from environment variables
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Define constants
//take this name from from the calling function after Kafka message is consumed with the URL
// const mp4FileName = "trial1.mp4"; // Name of the original MP4 file on S3
const bucketName = process.env.AWS_BUCKET; // S3 bucket name from environment
const hlsFolder = "hls"; // Folder where HLS files will be stored

// Function to handle the entire process from S3 download to HLS conversion and re-upload
const s3ToS3 = async (mp4FileName) => {
  console.log("Starting script");
  console.time("req_time"); // Start a timer for tracking script execution time

  try {
    // Step 1: Download the MP4 file from S3 and save it locally
    console.log("Downloading S3 MP4 file locally");
    const mp4FilePath = `${mp4FileName}`;
    const writeStream = fs.createWriteStream("local.mp4"); // Local file path to save the downloaded video
    const readStream = s3
      .getObject({ Bucket: bucketName, Key: mp4FilePath })
      .createReadStream();
    readStream.pipe(writeStream); // Pipe the read stream to the write stream
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve); // Resolve the promise on successful download
      writeStream.on("error", reject); // Reject on any download error
    });
    console.log("Downloaded S3 MP4 file locally");

    // Step 2: Define resolutions and bitrates for HLS conversions
    const resolutions = [
      { resolution: "320x180", videoBitrate: "500k", audioBitrate: "64k" },
      { resolution: "854x480", videoBitrate: "1000k", audioBitrate: "128k" },
      { resolution: "1280x720", videoBitrate: "2500k", audioBitrate: "192k" },
    ];

    const variantPlaylists = []; // Array to hold information on each HLS variant playlist

    // Step 3: Loop through each resolution to generate HLS variants
    for (const { resolution, videoBitrate, audioBitrate } of resolutions) {
      console.log(`HLS conversion starting for ${resolution}`);

      // Define output playlist and segment filenames for this resolution
      const outputFileName = `${mp4FileName.replace(
        ".",
        "_"
      )}_${resolution}.m3u8`;
      const segmentFileName = `${mp4FileName.replace(
        ".",
        "_"
      )}_${resolution}_%03d.ts`;

      // Convert the MP4 file to HLS format at the specified resolution and bitrates
      await new Promise((resolve, reject) => {
        ffmpeg("./local.mp4")
          .outputOptions([
            `-c:v h264`, // Set video codec to H.264
            `-b:v ${videoBitrate}`, // Set video bitrate
            `-c:a aac`, // Set audio codec to AAC
            `-b:a ${audioBitrate}`, // Set audio bitrate
            `-vf scale=${resolution}`, // Scale video to target resolution
            `-f hls`, // Specify output format as HLS
            `-hls_time 10`, // Set segment duration to 10 seconds
            `-hls_list_size 0`, // Disable list size limit for HLS playlist
            `-hls_segment_filename hls/${segmentFileName}`, // Define segment file naming
          ])
          .output(`hls/${outputFileName}`) // Output the variant playlist for this resolution
          .on("end", () => resolve()) // Resolve on successful conversion
          .on("error", (err) => reject(err)) // Reject on error
          .run();
      });

      // Store information about this variant playlist
      variantPlaylists.push({ resolution, outputFileName });
      console.log(`HLS conversion done for ${resolution}`);
    }

    // Step 4: Generate the master playlist to link all variant playlists
    console.log(`HLS master m3u8 playlist generating`);
    let masterPlaylist = variantPlaylists
      .map((variantPlaylist) => {
        const { resolution, outputFileName } = variantPlaylist;

        // Set estimated bandwidth values based on resolution
        const bandwidth =
          resolution === "320x180"
            ? 676800
            : resolution === "854x480"
            ? 1353600
            : 3230400;

        // Create playlist entry for each variant
        return `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}\n${outputFileName}`;
      })
      .join("\n");

    // Add the HLS master playlist header
    masterPlaylist = `#EXTM3U\n` + masterPlaylist;

    // Write the master playlist to a file
    const masterPlaylistFileName = `${mp4FileName.replace(
      ".",
      "_"
    )}_master.m3u8`;
    const masterPlaylistPath = `hls/${masterPlaylistFileName}`;
    fs.writeFileSync(masterPlaylistPath, masterPlaylist);
    console.log(`HLS master m3u8 playlist generated`);

    // Step 5: Delete the locally downloaded MP4 file to free up space
    console.log(`Deleting locally downloaded S3 MP4 file`);
    fs.unlinkSync("local.mp4");
    console.log(`Deleted locally downloaded S3 MP4 file`);

    // Step 6: Upload all HLS files (playlists and segments) to S3
    console.log(`Uploading media m3u8 playlists and TS segments to S3`);
    const files = fs.readdirSync(hlsFolder);
    for (const file of files) {
      // Only upload files that match the HLS naming convention
      if (!file.startsWith(mp4FileName.replace(".", "_"))) continue;

      const filePath = path.join(hlsFolder, file);
      const fileStream = fs.createReadStream(filePath);

      // Define upload parameters, including content type based on file extension
      const uploadParams = {
        Bucket: bucketName,
        Key: `${hlsFolder}/${file}`,
        Body: fileStream,
        ContentType: file.endsWith(".ts")
          ? "video/mp2t"
          : file.endsWith(".m3u8")
          ? "application/x-mpegURL"
          : null,
      };

      // Upload each file to S3 and delete locally after upload
      await s3.upload(uploadParams).promise();
      fs.unlinkSync(filePath);
    }

    console.log(
      `Uploaded media m3u8 playlists and TS segments to S3. Also deleted locally`
    );

    console.log("Success. Time taken: ");
    console.timeEnd("req_time"); // End the timer and log execution time
  } catch (error) {
    console.error("Error:", error); // Log any errors encountered
  }
};

// Export the function for use in other modules
export default s3ToS3;
