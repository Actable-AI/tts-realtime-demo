# stream_openai_chat.py
import openai
import asyncio
import json
import re

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Nếu dùng frontend React ở cổng khác
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            api_key = payload["api_key"]
            prompt = payload["prompt"]
            text = payload["text"]
            
            openai.api_key = api_key

            response = await openai.ChatCompletion.acreate(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": text},
                ],
                stream=True,
            )

            buffer = ""
            async for chunk in response:
                if "choices" in chunk:
                    delta = chunk["choices"][0]["delta"]
                    if "content" in delta:
                        token = delta["content"]
                        buffer += token

                        matches = list(re.finditer(r"\S+\s+", buffer))
                        for match in matches:
                            word = match.group()
                            await websocket.send_text(word)
                            await asyncio.sleep(0.1)

                        if matches:
                            last = matches[-1]
                            buffer = buffer[last.end():]

            if buffer:
                await websocket.send_text(buffer)
                await asyncio.sleep(0.1)

            await websocket.send_text("[DONE]")

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        await websocket.send_text(f"[ERROR] {str(e)}")

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port="8080")
