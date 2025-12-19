# Firebase Cloud Functions 설정 가이드

## 환경변수 설정

### 1. Firebase Functions Config 사용 (권장)

```bash
# Supabase URL 설정
firebase functions:config:set supabase.url="https://your-project.supabase.co"

# Supabase Service Role Key 설정
firebase functions:config:set supabase.service_role_key="your-service-role-key-here"
```

### 2. 환경변수 파일 사용 (로컬 개발)

`.env` 파일 생성 (functions 폴더 내):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## 배포

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## 로컬 테스트

```bash
cd functions
npm install
npm run serve
```

## 보안 주의사항

⚠️ **Service Role Key는 절대 클라이언트에 노출하지 마세요!**

- `.gitignore`에 `.env` 파일이 포함되어 있는지 확인
- Firebase Functions Config는 서버 사이드에서만 접근 가능
- Service Role Key는 Supabase Dashboard > Settings > API에서 확인 가능
