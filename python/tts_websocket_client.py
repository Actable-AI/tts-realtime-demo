import asyncio
import json
import os
from datetime import datetime

import websockets


async def tts_client():
    uri = "wss://api.blaze.vn/v1/tts/realtime"

    print(f"Connecting to {uri}...")
    async with websockets.connect(uri) as websocket:
        print("Connection established, waiting for success message...")

        # Wait for connection success message
        response = await websocket.recv()
        response_data = json.loads(response)
        print(f"Received: {response_data}")

        if response_data.get("type") == "successful-connection":
            # Send authentication token
            auth_message = {
                "token": "YOUR_AUTH_TOKEN",
                "strategy": "token",
            }
            await websocket.send(json.dumps(auth_message))
            print(f"Sent authentication: {auth_message}")

            # Wait for authentication success
            auth_response = await websocket.recv()
            auth_response_data = json.loads(auth_response)
            print(f"Received: {auth_response_data}")

            if auth_response_data.get("type") == "successful-authentication":
                # Send TTS query
                query_message = {
                    "query": "Xin chào,",
                    "normalization": "basic",
                    "language": "vi",
                    "audio_format": "mp3",
                    "audio_quality": 32,
                    "audio_speed": "1",
                    "speaker_id": "HN-Nam-2-BL",
                }
                await websocket.send(json.dumps(query_message))
                print(f"Sent query: {query_message}")

                query_message2 = {
                    "query": "tôi là một trợ lý ảo. Bạn có thể giúp tôi với một số thông tin không?",
                    "normalization": "basic",
                    "language": "vi",
                    "audio_format": "mp3",
                    "audio_quality": 32,
                    "audio_speed": "1",
                    "speaker_id": "HN-Nam-2-BL",
                }
                await websocket.send(json.dumps(query_message2))
                print(f"Sent query: {query_message2}")

                # Wait for processing message
                processing_response = await websocket.recv()
                processing_data = json.loads(processing_response)
                print(f"Received: {processing_data}")

                if processing_data.get("type") == "processing-request":
                    # Wait for byte stream start message
                    stream_start = await websocket.recv()
                    stream_start_data = json.loads(stream_start)
                    print(f"Received: {stream_start_data}")

                    if stream_start_data.get("status") == "started-byte-stream":
                        # Create output directory if it doesn't exist
                        os.makedirs("output", exist_ok=True)

                        # Generate filename with timestamp
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"output/tts_output_{timestamp}.mp3"

                        print(
                            f"Starting to receive audio stream, saving to {filename}..."
                        )
                        with open(filename, "wb") as f:
                            # Process audio stream until finished
                            while True:
                                try:
                                    message = await websocket.recv()

                                    # Check if it's a string message (JSON) or bytes
                                    if isinstance(message, str):
                                        message_data = json.loads(message)
                                        print(f"Received message: {message_data}")

                                        # Check if stream is finished
                                        if (
                                            message_data.get("type")
                                            == "finished-byte-stream"
                                        ):
                                            print("Byte stream finished")
                                            break
                                    else:
                                        # It's binary data (audio bytes), write to file
                                        f.write(message)
                                        print(
                                            ".", end="", flush=True
                                        )  # Progress indicator
                                except Exception as e:
                                    print(f"Error receiving message: {e}")
                                    break

                        print(f"\nAudio saved to {filename}")
                    else:
                        print("Error: Did not receive byte stream start message")
                else:
                    print("Error: Request processing confirmation not received")
            else:
                print("Error: Authentication failed")
        else:
            print("Error: Connection not confirmed as successful")


if __name__ == "__main__":
    asyncio.run(tts_client())
