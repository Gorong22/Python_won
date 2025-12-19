# Firebase Cloud Functions 배포 가이드

## ✅ 배포 완료

**함수명**: `createCreatorProfile`  
**Region**: `us-central1`  
**Runtime**: Node.js 20  
**상태**: Active

## 🔧 환경변수 설정 (필수)

배포된 함수가 정상 작동하려면 Supabase 환경변수를 설정해야 합니다.

### 방법 1: Firebase Functions Config (권장, 하지만 Deprecated)

```bash
# Supabase URL 설정
firebase functions:config:set supabase.url="https://ksipcrcimsnjkgmwzovo.supabase.co"

# Supabase Service Role Key 설정
# Supabase Dashboard > Settings > API > service_role key 복사
firebase functions:config:set supabase.service_role_key="your-service-role-key-here"

# 설정 후 재배포
firebase deploy --only functions:createCreatorProfile
```

⚠️ **주의**: `functions.config()`는 2026년 3월에 deprecated됩니다.

### 방법 2: Secret Manager (권장, 최신 방식)

```bash
# Secret 생성
firebase functions:secrets:set SUPABASE_URL
firebase functions:secrets:set SUPABASE_SERVICE_ROLE_KEY

# functions/index.js 수정 필요 (Secret Manager 사용)
```

### 방법 3: 환경변수 (로컬 개발용)

로컬 개발 시에만 사용:

```bash
# functions/.env 파일 생성
SUPABASE_URL=https://ksipcrcimsnjkgmwzovo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## 📋 배포 명령어

### 전체 Functions 배포

```bash
cd /Users/mac/Python_basic/Python_won/pdp/MUMU_project_2
firebase deploy --only functions
```

### 특정 함수만 배포

```bash
firebase deploy --only functions:createCreatorProfile
```

### Cleanup Policy 설정 (선택사항)

```bash
firebase deploy --only functions --force
# 또는
firebase functions:artifacts:setpolicy
```

## ✅ 배포 확인 체크리스트

### 1. Firebase Console 확인

- [ ] Firebase Console > Functions 이동
- [ ] `createCreatorProfile` 함수가 표시되는지 확인
- [ ] 상태가 **Active**인지 확인
- [ ] Region이 **us-central1**인지 확인

### 2. 함수 URL 확인

- [ ] 호출 URL: `https://us-central1-mumu-3db59.cloudfunctions.net/createCreatorProfile`
- [ ] 이 URL은 `httpsCallable`이 내부적으로 사용합니다

### 3. 실제 호출 테스트

- [ ] `signup_creator.html`에서 Creator 회원가입 시도
- [ ] 브라우저 콘솔에서 CORS 에러가 없는지 확인
- [ ] Supabase `creators` 테이블에 레코드가 생성되는지 확인

## 🐛 배포 실패 시 해결법

### 에러 1: "Runtime Node.js 18 was decommissioned"

**해결**: `firebase.json`과 `functions/package.json`에서 Node.js 20으로 업그레이드

```json
// firebase.json
"runtime": "nodejs20"

// functions/package.json
"engines": { "node": "20" }
```

### 에러 2: "Supabase configuration missing"

**해결**: 환경변수 설정 후 재배포

```bash
firebase functions:config:set supabase.url="..."
firebase functions:config:set supabase.service_role_key="..."
firebase deploy --only functions:createCreatorProfile
```

### 에러 3: "Functions codebase could not be analyzed"

**해결**:

- `functions/index.js`에 문법 오류가 없는지 확인
- 초기화 시점에 throw하는 코드가 없는지 확인 (런타임에만 체크)

### 에러 4: "Permission denied" 또는 "API not enabled"

**해결**:

```bash
# 필요한 API 활성화
firebase deploy --only functions
# 자동으로 API가 활성화됩니다
```

## 🔍 함수 로그 확인

```bash
# 실시간 로그 확인
firebase functions:log

# 특정 함수 로그만 확인
firebase functions:log --only createCreatorProfile
```

## 📝 현재 배포 상태

- ✅ **함수명**: `createCreatorProfile`
- ✅ **Region**: `us-central1`
- ✅ **Runtime**: Node.js 20
- ✅ **타입**: HTTPS Callable
- ⚠️ **환경변수**: 설정 필요 (위의 "환경변수 설정" 참고)

## 🎯 다음 단계

1. **환경변수 설정** (위의 "환경변수 설정" 참고)
2. **재배포** (환경변수 설정 후)
3. **테스트**: Creator 회원가입 플로우 테스트
4. **확인**: Supabase `creators` 테이블에 레코드 생성 확인
