# project

## 고정 운영 값

- PROJECT_ID: `meme-radar-kr-prod`
- REGION: `asia-northeast3` (서울)

## Run (API Server)

```powershell
node project/server.js
```

## Check API

```powershell
curl "http://127.0.0.1:8787/api/health"
curl "http://127.0.0.1:8787/api/v1/snapshot?period=today"
```

## gcloud 기본 설정

```powershell
gcloud config set project meme-radar-kr-prod
gcloud config set run/region asia-northeast3
```
