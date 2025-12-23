# Google Sheets 연동 설정 가이드

베타테스터 신청 폼의 데이터를 Google Sheets에 자동으로 저장하도록 설정하는 방법입니다.

## 1단계: Google Apps Script 프로젝트 생성

1. https://script.google.com 에 접속
2. "새 프로젝트" 클릭
3. 프로젝트 이름을 "MUMU Beta Form Handler"로 변경

## 2단계: 스크립트 코드 작성

1. `google-apps-script.js` 파일의 내용을 복사
2. Google Apps Script 에디터에 붙여넣기
3. **중요**: `SPREADSHEET_ID` 변수가 올바른지 확인
   - 현재 설정된 ID: `1lH-HAMSa9493QUzQc9ZnT0Um6rgHmDj3NQaKtqUR3pA`
   - Google Sheets URL의 `/d/` 뒤에 오는 긴 문자열이 ID입니다

## 3단계: 스크립트 배포

1. 상단 메뉴에서 "배포" > "새 배포" 클릭
2. 설정 아이콘(⚙️) 클릭 > "웹 앱" 선택
3. 다음 설정을 입력:
   - **설명**: "MUMU Beta Form Handler"
   - **다음 사용자로 실행**: "나"
   - **액세스 권한**: "모든 사용자" 선택
4. "배포" 버튼 클릭
5. 권한 승인 요청이 나오면 "권한 확인" > 계정 선택 > "고급" > "MUMU Beta Form Handler(안전하지 않음)로 이동" > "허용"
6. 생성된 **웹 앱 URL**을 복사

## 4단계: 웹사이트에 URL 연결

1. `script.js` 파일 열기
2. 다음 줄을 찾습니다:
   ```javascript
   const GAS_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
   ```
3. `YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`를 3단계에서 복사한 웹 앱 URL로 교체

예시:
```javascript
const GAS_URL = "https://docs.google.com/spreadsheets/d/1lH-HAMSa9493QUzQc9ZnT0Um6rgHmDj3NQaKtqUR3pA/edit?usp=sharing";
```

## 5단계: 테스트

1. 웹사이트에서 베타테스터 신청 폼 작성
2. "MUMU 베타테스터 신청하기" 버튼 클릭
3. 성공 팝업이 표시되는지 확인
4. Google Sheets에서 데이터가 추가되었는지 확인

## 문제 해결

### 데이터가 저장되지 않는 경우
- Google Apps Script의 실행 로그 확인: 왼쪽 메뉴 > "실행" 탭
- `SPREADSHEET_ID`가 올바른지 확인
- 시트 이름이 "시트1"인지 확인 (다른 이름인 경우 `google-apps-script.js`의 `SHEET_NAME` 변수 수정)

### 권한 오류가 발생하는 경우
- Google Apps Script에서 권한을 다시 승인해야 할 수 있습니다
- "배포" > "배포 관리" > 배포 옆의 "수정" 아이콘 클릭 > 권한 다시 승인

### CORS 오류가 발생하는 경우
- 현재 설정은 `no-cors` 모드를 사용하므로 대부분의 경우 문제없이 작동합니다
- 만약 문제가 있다면, Google Apps Script의 `doPost` 함수에서 CORS 헤더를 추가해야 할 수 있습니다
