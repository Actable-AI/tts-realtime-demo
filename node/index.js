const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

async function ttsClient() {
  const uri = "wss://api.blaze.vn/v1/tts/realtime";

  console.log(`Connecting to ${uri}...`);
  const websocket = new WebSocket(uri);

  // Variables for file handling
  let fileStream = null;
  let filename = "";

  // Add a timeout to detect if we're stuck waiting
  const connectionTimeout = setTimeout(() => {
    console.log("Connection seems to be stuck. Dumping raw socket state:");
    console.log("WebSocket readyState:", websocket.readyState);
    // Don't close the connection yet, just report status
  }, 5000);

  websocket.on("open", () => {
    console.log("Connection established, waiting for success message...");
    clearTimeout(connectionTimeout);
  });

  websocket.on("message", async (data) => {
    try {
      console.log("Received raw data type:", typeof data);

      // Check if the message is binary data
      if (data instanceof Buffer) {
        // Try to decode it as a JSON message first
        try {
          const textData = data.toString("utf8");
          // Check if it looks like JSON
          if (
            textData.trim().startsWith("{") &&
            textData.trim().endsWith("}")
          ) {
            console.log("Received JSON in binary format:", textData);
            const message = JSON.parse(textData);
            handleJsonMessage(message, websocket);
            return;
          }
        } catch (decodeError) {
          // Not valid JSON, treat as binary audio data
        }

        // If we're here, it's likely binary audio data
        console.log("Received binary data of length:", data.length);
        if (fileStream) {
          fileStream.write(data);
          process.stdout.write("."); // Progress indicator
        }
        return;
      }

      // Text message handling
      console.log(
        "Raw text message received:",
        data.toString().substring(0, 200)
      );
      const message = JSON.parse(data.toString());
      handleJsonMessage(message, websocket);
    } catch (error) {
      console.error(`Error processing message: ${error.message}`);
      console.error(
        "Raw data that caused the error:",
        data instanceof Buffer
          ? `Binary data of length ${data.length}`
          : data.toString().substring(0, 200)
      );

      // Don't close connection on parsing errors, might be non-critical
      if (
        error.message.includes("fatal") ||
        error.message.includes("connection")
      ) {
        if (fileStream) fileStream.end();
        websocket.close();
      }
    }
  });

  // Separate function to handle JSON messages
  function handleJsonMessage(message, websocket) {
    console.log(`Parsed message: ${JSON.stringify(message)}`);

    // Handle different message types
    if (message.type === "successful-connection") {
      console.log("Received success connection message");

      // Send authentication token
      const authMessage = {
        token: "YOUR_AUTH_TOKEN",
        strategy: "token",
      };
      console.log(`Sending authentication: ${JSON.stringify(authMessage)}`);
      websocket.send(JSON.stringify(authMessage));
    } else if (message.type === "successful-authentication") {
      console.log("Authentication successful, sending TTS queries");

      // Send first TTS query after a short delay
      setTimeout(() => {
        const queryMessage = {
          query: "Xin chào, ",
          normalization: "basic",
          language: "vi",
          audio_format: "mp3",
          audio_quality: 32,
          audio_speed: "1",
          speaker_id: "HN-Nam-2-BL",
        };
        console.log(`Sending first query: ${JSON.stringify(queryMessage)}`);
        websocket.send(JSON.stringify(queryMessage));
      }, 100);

      // Send second TTS query after a slightly longer delay
      setTimeout(() => {
        const queryMessage2 = {
          query:
            "tôi là một trợ lý ảo. Bạn có thể giúp tôi với một số thông tin không?",
          normalization: "basic",
          language: "vi",
          audio_format: "mp3",
          audio_quality: 32,
          audio_speed: "1",
          speaker_id: "HN-Nam-2-BL",
        };
        console.log(`Sending second query: ${JSON.stringify(queryMessage2)}`);
        websocket.send(JSON.stringify(queryMessage2));
      }, 500);
    } else if (message.type === "processing-request") {
      console.log("Request is being processed");
    } else if (message.status === "started-byte-stream") {
      // Create output directory if it doesn't exist
      if (!fs.existsSync("output")) {
        fs.mkdirSync("output");
      }

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "")
        .replace("T", "_")
        .slice(0, 19);
      filename = `output/tts_output_${timestamp}.mp3`;

      console.log(`Starting to receive audio stream, saving to ${filename}...`);
      fileStream = fs.createWriteStream(filename);
    } else if (message.type === "finished-byte-stream") {
      console.log("\nByte stream finished");
      if (fileStream) {
        fileStream.end();
        console.log(`Audio saved to ${filename}`);
      }
      // Don't close the connection here to allow for the second query to be processed
    } else {
      console.log(`Unhandled message type: ${message.type || "unknown"}`);
    }
  }

  websocket.on("ping", (data) => {
    console.log("Received ping from server");
  });

  websocket.on("pong", (data) => {
    console.log("Received pong from server");
  });

  websocket.on("error", (error) => {
    console.error(`WebSocket error: ${error.message}`);
    if (fileStream) fileStream.end();
  });

  websocket.on("close", (code, reason) => {
    console.log(
      `Connection closed. Code: ${code}, Reason: ${
        reason || "No reason provided"
      }`
    );
    if (fileStream) fileStream.end();
  });

  // Handle process termination
  process.on("SIGINT", () => {
    console.log("Process interrupted, closing connection...");
    if (fileStream) fileStream.end();
    websocket.close();
    process.exit(0);
  });
}

// Run the client
ttsClient().catch((error) => {
  console.error(`Error in TTS client: ${error}`);
});
