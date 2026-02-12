# Mini Cloud Storage API (Node.js + Express)

Simple VPS-ready upload server with dynamic folder-based image storage (S3-style folder grouping).

## Features

- Upload images into dynamic folders (`/uploads/<folder>/...`)
- Auto-create folders if missing
- UUID-based file naming
- Public static access to uploaded files
- List all folders
- List files inside a folder
- Delete a file from a folder
- Centralized error handling
- Safety checks:
  - allowed image types only (`jpg`, `jpeg`, `png`, `webp`)
  - max file size `10MB`
  - folder/file sanitization
  - directory traversal protection

## Project Structure

```txt
upload-server/
  server.js
  routes/uploadRoutes.js
  middleware/errorMiddleware.js
  uploads/
  .env
  package.json
```

## Setup

1. Install dependencies:

```bash
cd "upload-server"
npm install
```

2. Configure environment:

`.env`
```env
PORT=4000
BASE_URL=http://localhost:4000
```

For VPS deployment, set `BASE_URL` to your public IP/domain:

```env
BASE_URL=http://your-vps-ip:4000
```

3. Start server:

```bash
npm run dev
# or
npm start
```

4. Health check:

```bash
curl http://localhost:4000/health
```

## API Endpoints

Base URL (local): `http://localhost:4000`

### 1) Upload Images

`POST /upload`

Content type: `multipart/form-data`

Fields:
- `folder` (string, required)  
  Allowed pattern: letters, numbers, `_`, `-` only
- `images[]` (file, required, multiple allowed)

Example:

```bash
curl -X POST http://localhost:4000/upload \
  -F "folder=teamA" \
  -F "images[]=@/absolute/path/photo1.jpg" \
  -F "images[]=@/absolute/path/photo2.png"
```

Success response:

```json
{
  "success": true,
  "folder": "teamA",
  "files": [
    "http://localhost:4000/uploads/teamA/0adf9365-d5b5-4bec-893f-13e9b867edc4.jpg",
    "http://localhost:4000/uploads/teamA/0c1d74ec-49db-46ef-a710-083d914303d9.png"
  ]
}
```

### 2) Public File Access

`GET /uploads/:folder/:filename`

Example:

```bash
curl -I http://localhost:4000/uploads/teamA/0adf9365-d5b5-4bec-893f-13e9b867edc4.jpg
```

### 3) List All Folders

`GET /folders`

Example:

```bash
curl http://localhost:4000/folders
```

Response:

```json
{
  "success": true,
  "folders": ["teamA", "user123", "wedding_2026"]
}
```

### 4) List Files in Folder

`GET /folders/:folder/files`

Example:

```bash
curl http://localhost:4000/folders/teamA/files
```

Response:

```json
{
  "success": true,
  "folder": "teamA",
  "files": [
    "http://localhost:4000/uploads/teamA/0adf9365-d5b5-4bec-893f-13e9b867edc4.jpg",
    "http://localhost:4000/uploads/teamA/0c1d74ec-49db-46ef-a710-083d914303d9.png"
  ]
}
```

### 5) Delete File

`DELETE /folders/:folder/files/:filename`

Example:

```bash
curl -X DELETE \
  http://localhost:4000/folders/teamA/files/0adf9365-d5b5-4bec-893f-13e9b867edc4.jpg
```

Response:

```json
{
  "success": true,
  "message": "File deleted successfully.",
  "folder": "teamA",
  "filename": "0adf9365-d5b5-4bec-893f-13e9b867edc4.jpg"
}
```

## Error Examples

Invalid folder:

```bash
curl -X POST http://localhost:4000/upload \
  -F "folder=../hack" \
  -F "images[]=@/absolute/path/photo.jpg"
```

Invalid file type:

```bash
curl -X POST http://localhost:4000/upload \
  -F "folder=teamA" \
  -F "images[]=@/absolute/path/file.txt"
```

Too large file (>10MB):

```json
{
  "success": false,
  "message": "File too large. Max allowed size is 10MB."
}
```

## Notes for Production (VPS)

- Put Nginx (or another reverse proxy) in front of Node.js
- Serve via HTTPS
- Restrict upload/delete endpoints with auth (API key or JWT)
- Add rate limiting to reduce abuse

