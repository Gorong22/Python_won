# Firebase Cloud Functions 배포 명령어

## ✅ 배포 완료 상태

**함수명**: `createCreatorProfile`  
**Region**: `us-central1`  
**Runtime**: Node.js 20  
**상태**: ✅ Active (배포 완료)

## 🔧 환경변수 설정 (필수 - 아직 미완료)

### 1단계: Supabase Service Role Key 설정

```bash
cd /Users/mac/Python_basic/Python_won/pdp/MUMU_project_2

# Supabase Service Role Key 설정
# ⚠️ Supabase Dashboard > Settings > API > service_role key를 복사하여 아래 명령어 실행
firebase functions:config:set supabase.service_role_key="여기에_Service_Role_Key_붙여넣기"
```

### 2단계: 환경변수 적용을 위한 재배포

```bash
firebase deploy --only functions:createCreatorProfile
```

## 📋 전체 배포 프로세스 (처음부터)

### 1. 의존성 설치

```bash
cd /Users/mac/Python_basic/Python_won/pdp/MUMU_project_2/functions
npm install
```

### 2. 환경변수 설정

```bash
cd /Users/mac/Python_basic/Python_won/pdp/MUMU_project_2

# Supabase URL (이미 설정됨)
firebase functions:config:set supabase.url="https://ksipcrcimsnjkgmwzovo.supabase.co"

# Supabase Service Role Key (필수 - 아직 미설정)
firebase functions:config:set supabase.service_role_key="여기에_Service_Role_Key_붙여넣기"
```

### 3. Functions 배포

```bash
firebase deploy --only functions:createCreatorProfile
```

### 4. 배포 확인

```bash
# 함수 목록 확인
firebase functions:list

# 예상 출력:
# ┌──────────────────────┬─────────┬──────────┬─────────────┬────────┬──────────┐
# │ Function             │ Version │ Trigger  │ Location    │ Memory │ Runtime  │
# ├──────────────────────┼─────────┼──────────┼─────────────┼────────┼──────────┤
# │ createCreatorProfile │ v1      │ callable │ us-central1 │ 256    │ nodejs20 │
# └──────────────────────┴─────────┴──────────┴─────────────┴────────┴──────────┘
```

## ✅ 배포 성공/실패 판별 체크리스트

### 배포 성공 기준

- [x] `firebase functions:list` 명령어 실행 시 `createCreatorProfile` 함수가 표시됨
- [x] 상태가 **Active**로 표시됨
- [x] Region이 **us-central1**로 표시됨
- [x] Runtime이 **nodejs20**로 표시됨
- [ ] 환경변수 설정 후 재배포 완료
- [ ] `signup_creator.html`에서 Creator 회원가입 시 CORS 에러 없음
- [ ] Supabase `creators` 테이블에 레코드가 정상 생성됨

### 배포 실패 시 확인사항

1. **에러**: "Runtime Node.js 18 was decommissioned"

   - ✅ 해결됨: Node.js 20으로 업그레이드 완료

2. **에러**: "Supabase configuration missing"

   - ⚠️ 해결 필요: Service Role Key 설정 후 재배포

3. **에러**: "Functions codebase could not be analyzed"

   - ✅ 해결됨: 초기화 시점 throw 제거 완료

4. **에러**: "Permission denied" 또는 "API not enabled"
   - ✅ 해결됨: 자동으로 API 활성화됨

## 🎯 "이제 이 에러가 사라진다"는 기준

### CORS 에러 해결 기준

1. ✅ **함수 배포 완료**: `firebase functions:list`에서 `createCreatorProfile` 확인
2. ⚠️ **환경변수 설정**: Service Role Key 설정 후 재배포
3. ✅ **호출 방식**: `httpsCallable`만 사용 (직접 fetch 없음)
4. ✅ **Region 명시**: `getFunctions(app, "us-central1")` 사용

### 최종 확인 방법

```bash
# 1. 함수 목록 확인
firebase functions:list

# 2. 함수 로그 확인 (실시간)
firebase functions:log --only createCreatorProfile

# 3. 브라우저에서 테스트
# - signup_creator.html 열기
# - Creator 회원가입 시도
# - 브라우저 콘솔에서 CORS 에러 없음 확인
# - Network 탭에서 createCreatorProfile 호출 성공 확인
```

## 📝 현재 상태

- ✅ **배포 완료**: `createCreatorProfile` 함수가 `us-central1`에 배포됨
- ✅ **코드 수정 완료**: `httpsCallable`만 사용, 직접 fetch 호출 없음
- ⚠️ **환경변수 미설정**: Service Role Key 설정 필요
- ⚠️ **재배포 필요**: 환경변수 설정 후 재배포 필요

## 🚀 다음 단계

1. **Supabase Dashboard에서 Service Role Key 복사**

   - Supabase Dashboard > Settings > API > service_role key

2. **환경변수 설정**

   ```bash
   firebase functions:config:set supabase.service_role_key="복사한_키_붙여넣기"
   ```

3. **재배포**

   ```bash
   firebase deploy --only functions:createCreatorProfile
   ```

4. **테스트**
   - `signup_creator.html`에서 Creator 회원가입 테스트
   - CORS 에러 없음 확인
   - Supabase `creators` 테이블에 레코드 생성 확인
