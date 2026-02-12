# How To Use Mini Cloud Storage API

## 1) Start the Server

```bash
cd "upload-server"
npm install
npm run dev
```

If you use `npm start`, run:

```bash
npm start
```

## 2) Check Server Status

```bash
curl http://localhost:4000/health
```

Expected:

```json
{"success":true,"message":"Upload server is running"}
```

## 3) Upload Images to a Folder

Use `images[]` and `folder`:

```bash
curl -X POST http://localhost:4000/upload \
  -F "folder=teamA" \
  -F "images[]=@/absolute/path/photo1.jpg" \
  -F "images[]=@/absolute/path/photo2.png"
```

Example success response:

```json
{
  "success": true,
  "folder": "teamA",
  "files": [
    "http://localhost:4000/uploads/teamA/uuid-file-1.jpg",
    "http://localhost:4000/uploads/teamA/uuid-file-2.png"
  ]
}
```

## 4) Open Uploaded File in Browser

Use any URL from the `files` array:

```txt
http://localhost:4000/uploads/teamA/uuid-file-1.jpg
```

## 5) List All Folders

```bash
curl http://localhost:4000/folders
```

## 6) List Files in One Folder

```bash
curl http://localhost:4000/folders/teamA/files
```

## 7) Delete a File

```bash
curl -X DELETE \
  http://localhost:4000/folders/teamA/files/uuid-file-1.jpg
```

## 8) Common Errors

Invalid folder name:

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

File too large (>10MB):

```json
{
  "success": false,
  "message": "File too large. Max allowed size is 10MB."
}
```

## 9) VPS Usage

Set `BASE_URL` in `.env` to public IP/domain:

```env
PORT=4000
BASE_URL=http://your-vps-ip:4000
```

Then restart server:

```bash
npm run dev
```

