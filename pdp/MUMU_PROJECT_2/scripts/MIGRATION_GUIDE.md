# Firebase Auth 이메일 도메인 마이그레이션 가이드

## 📌 개요

기존 `@mumu.local` 계정을 `@mumu.app` 계정으로 마이그레이션하는 가이드입니다.

## 🎯 목표

1. **신규 회원**: 모든 신규 회원은 `username@mumu.app`으로 통일
2. **기존 회원**: 기존 `@mumu.local` 계정을 `@mumu.app`으로 마이그레이션
3. **데이터 보존**: Firestore 데이터 및 uid는 절대 변경하지 않음

## 📋 사전 준비

### 1. Firebase 서비스 계정 키 파일 준비

1. Firebase Console 접속: https://console.firebase.google.com/
2. 프로젝트 선택: `mumu-3db59`
3. 프로젝트 설정 → 서비스 계정 탭
4. "새 비공개 키 생성" 클릭
5. 다운로드된 JSON 파일을 프로젝트 루트에 `serviceAccountKey.json`으로 저장

```
MUMU_project_2/
├── serviceAccountKey.json  ← 여기에 저장
├── package.json
├── scripts/
│   └── migrate_auth_email.js
└── ...
```

⚠️ **보안 주의**: `serviceAccountKey.json`은 절대 Git에 커밋하지 마세요. 이미 `.gitignore`에 추가되어 있습니다.

### 2. Node.js 및 npm 설치 확인

```bash
node --version  # v14 이상 권장
npm --version
```

### 3. 의존성 설치

```bash
cd /Users/mac/Python_basic/Python_won/pdp/MUMU_project_2
npm install
```

## 🚀 마이그레이션 실행

### 단계별 실행

```bash
# 1. 프로젝트 루트로 이동
cd /Users/mac/Python_basic/Python_won/pdp/MUMU_project_2

# 2. 서비스 계정 키 파일 확인
ls -la serviceAccountKey.json

# 3. 마이그레이션 스크립트 실행
npm run migrate
# 또는
node scripts/migrate_auth_email.js
```

### 실행 결과 예시

```
✅ Firebase Admin SDK 초기화 완료

🚀 마이그레이션 시작...

📊 총 150개의 사용자 문서를 발견했습니다.

[1/150] 처리 중: testuser (uid: abc123...)
  📝 새 Auth 계정 생성 중: testuser@mumu.app
  ✅ 새 Auth 계정 생성 완료: testuser@mumu.app (uid: abc123...)
  ✅ Firestore 업데이트 완료: auth_email = testuser@mumu.app
  ⚠️  기존 @mumu.local 계정 비활성화: abc123...
  ✅ 마이그레이션 완료: testuser

[2/150] 처리 중: existinguser (uid: def456...)
  ⏭️  이미 마이그레이션 완료된 계정입니다.

...

============================================================
📊 마이그레이션 결과 요약
============================================================
총 처리 대상: 150명
✅ 성공: 145명
⏭️  건너뜀: 3명
❌ 실패: 2명
============================================================

✅ 마이그레이션 스크립트 실행 완료
```

## 🔍 마이그레이션 동작 방식

### 1. Firestore readers 컬렉션 순회

- 모든 `readers/{uid}` 문서를 조회
- 각 문서에서 `username`과 `uid` 추출

### 2. 계정 존재 여부 확인

- `${username}@mumu.app` 계정이 이미 존재하는지 확인
- 존재하면 uid 일치 여부 확인 후 건너뜀

### 3. 새 Auth 계정 생성

- `${username}@mumu.app` 계정 생성
- 임시 랜덤 비밀번호 할당 (16자리)
- 생성된 계정의 uid가 Firestore uid와 일치하는지 확인

### 4. Firestore 업데이트

- `readers/{uid}` 문서에 다음 필드 추가:
  - `auth_email`: `${username}@mumu.app`
  - `migrated_at`: 서버 타임스탬프
  - `migrated_at_kst`: KST 시간 문자열

### 5. 기존 계정 비활성화

- 기존 `${username}@mumu.local` 계정이 존재하면 비활성화
- **삭제하지 않음** (데이터 보존)

## ⚠️ 주의사항

### 절대 금지 사항

- ❌ Firestore 문서 삭제
- ❌ uid 변경
- ❌ 기존 데이터 overwrite
- ❌ 자동 비밀번호 재설정 메일 발송

### 마이그레이션 후 작업

1. **비밀번호 재설정**

   - 마이그레이션된 사용자는 임시 비밀번호로 로그인 불가
   - 추후 UX 설계 단계에서 비밀번호 재설정 플로우 구현 필요

2. **기존 @mumu.local 계정 처리**

   - 현재는 비활성화만 수행
   - 필요시 수동으로 삭제 가능 (Firebase Console에서)

3. **테스트**
   - 마이그레이션 후 소수 계정으로 로그인 테스트 권장
   - `username@mumu.app` 형식으로 로그인 가능한지 확인

## 🐛 문제 해결

### 오류: "서비스 계정 키 파일을 찾을 수 없습니다"

```bash
# serviceAccountKey.json 파일이 프로젝트 루트에 있는지 확인
ls -la serviceAccountKey.json
```

### 오류: "Firebase Admin SDK 초기화 실패"

- 서비스 계정 키 파일의 JSON 형식 확인
- Firebase Console에서 새 키 파일 다운로드

### 오류: "충돌: 이메일이 다른 uid로 이미 존재합니다"

- 수동으로 확인 필요
- Firebase Console에서 해당 이메일 계정 확인

### 마이그레이션 중단 시

- 스크립트는 각 사용자를 독립적으로 처리
- 중단 후 재실행해도 이미 처리된 사용자는 건너뜀
- 실패한 사용자만 재처리됨

## 📝 검증 방법

### Firestore 확인

```javascript
// Firebase Console → Firestore Database
// readers 컬렉션에서 다음 필드 확인:
// - auth_email: "username@mumu.app"
// - migrated_at: 타임스탬프
// - migrated_at_kst: "2024-01-01 12:00:00"
```

### Firebase Auth 확인

```javascript
// Firebase Console → Authentication
// - username@mumu.app 계정이 생성되었는지 확인
// - username@mumu.local 계정이 비활성화되었는지 확인
```

## 📞 지원

문제가 발생하면 다음 정보와 함께 문의하세요:

- 마이그레이션 실행 로그
- 오류 메시지
- 영향받은 사용자 수
