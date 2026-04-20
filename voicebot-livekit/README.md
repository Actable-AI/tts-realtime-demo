# blaze_voicebot_intergration_sample

Sample Node.js app de tich hop voi Blaze external LiveKit API (`POST /v1/voicebot-livekit/session`) va hien thi giao dien call giong trang Voicebot LiveKit.

## Muc tieu

- Tich hop dung contract external API da trien khai.
- Khong can dang nhap/xac thuc nguoi dung tren sample app.
- Tat ca cau hinh nam trong `.env`.
- UI gom:
  - Avatar + ten voicebot
  - Input runtime `participantName`
  - Nut `Bat dau cuoc tro chuyen` / `Dung cuoc tro chuyen`
  - Trang thai ket noi voi dot do/xanh
  - Vung hien thi hinh anh agent gui ve
  - Transcript realtime (user/assistant)

## Cau truc

- `server.js`: Node + Express backend
  - `POST /api/session`: goi external API de tao LiveKit session
    - Ho tro runtime override cho `participantName`
  - `GET /api/config`: tra ve thong tin UI (ten/avatar)
- `public/index.html`: giao dien
- `public/app.js`: ket noi LiveKit va xu ly su kien
- `public/styles.css`: dark theme layout giong man hinh mau

## Yeu cau

- Node.js >= 18

## Cai dat

```bash
cd /workspace/actable-ai/blaze-platform/source/blaze_voicebot_intergration_sample
npm install
cp .env.example .env
```

Cap nhat `.env` toi thieu:

```env
EXTERNAL_API_BASE_URL=https://api-dev.blaze.vn
EXTERNAL_API_SESSION_PATH=/v1/voicebot-livekit/session
EXTERNAL_API_TOKEN=ae8983ad98df0108e130c55eda396d508a325292
VOICEBOT_ID=67f6f3f12a4e6db7a2c9a701
```

## Chay sample

```bash
npm start
```

Mo trinh duyet:

```text
http://localhost:3099
```

## Chay bang Docker Compose

```bash
cd /workspace/actable-ai/blaze-platform/source/blaze_voicebot_intergration_sample
docker compose up --build
```

App se chay tai:

```text
http://localhost:3099
```

## Contract external API duoc su dung

Sample goi dung endpoint da chot:

- `POST /v1/voicebot-livekit/session`

Request body backend sample gui:

```json
{
  "voicebotId": "<VOICEBOT_ID from .env>",
  "participantName": "<PARTICIPANT_NAME if provided>"
}
```

Headers:

```text
Authorization: Bearer <EXTERNAL_API_TOKEN>
Content-Type: application/json
```

Response duoc dung de connect LiveKit:

- `participantToken`
- `livekitUrl`
- `roomName`
- `sessionId`

## Ghi chu quan trong

1. "Khong can xac thuc" trong sample app nghia la:
   - Khong co login user.
   - Token external API duoc backend sample doc tu `.env` va goi server-to-server.
2. Token `EXTERNAL_API_TOKEN` van bat buoc va duoc lay tu DB (dung token raw).
3. Neu agent gui du lieu image qua data channel (type `images`) hoac transcript co image URL, sample se append vao vung image.
4. Cac thong so TTS/STT (audio quality/format/normalization...) duoc lay truc tiep tu cau hinh voicebot trong database, khong override tu sample UI.

## Troubleshooting nhanh

- Loi `external_api_unreachable`:
  - Thuong do DNS/network toi `EXTERNAL_API_BASE_URL`.
  - Kiem tra nhanh: `curl -I <EXTERNAL_API_BASE_URL>`

- Loi `external_api_error` voi `Not Found`:
  - Host da reachable nhung route khong ton tai tren environment do.
  - Kiem tra lai `EXTERNAL_API_SESSION_PATH` (mac dinh `/v1/voicebot-livekit/session`).
  - Neu env cua ban expose path khac, doi ngay trong `.env` ma khong can sua code.
