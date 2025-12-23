/**
 * Google Apps Script 코드
 * 
 * 설정 방법:
 * 1. https://script.google.com 에 접속
 * 2. "새 프로젝트" 클릭
 * 3. 아래 코드를 복사하여 붙여넣기
 * 4. 파일 > 프로젝트 설정에서 프로젝트 이름을 "MUMU Beta Form Handler"로 변경
 * 5. 배포 > 새 배포 클릭
 * 6. 유형 선택: "웹 앱"
 * 7. 설명: "MUMU Beta Form Handler"
 * 8. 다음 사용자로 실행: "나"
 * 9. 액세스 권한: "모든 사용자" 선택
 * 10. 배포 클릭
 * 11. 생성된 웹 앱 URL을 복사
 * 12. script.js 파일의 GAS_URL 변수에 붙여넣기
 * 
 * 참고: Google Sheets ID를 아래 코드의 SPREADSHEET_ID에 입력해야 합니다.
 * Sheets URL에서 /d/ 뒤의 긴 문자열이 ID입니다.
 * 예: https://docs.google.com/spreadsheets/d/1lH-HAMSa9493QUzQc9ZnT0Um6rgHmDj3NQaKtqUR3pA/edit
 *     ID: 1lH-HAMSa9493QUzQc9ZnT0Um6rgHmDj3NQaKtqUR3pA
 */

// Google Sheets ID (URL에서 /d/ 뒤의 문자열)
// const SPREADSHEET_ID = '1lH-HAMSa9493QUzQc9ZnT0Um6rgHmDj3NQaKtqUR3pA';

// // 시트 이름
// const SHEET_NAME = '시트1';

// /**
//  * POST 요청을 처리하는 함수
//  */
// function doPost(e) {
//     try {
//         // 요청 데이터 파싱
//         const data = JSON.parse(e.postData.contents);

//         // Google Sheets 열기
//         const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

//         // 첫 행에 헤더가 없는 경우 헤더 추가
//         if (sheet.getLastRow() === 0) {
//             sheet.appendRow([
//                 '타임스탬프',
//                 '이름',
//                 '성별',
//                 '전화번호',
//                 '이메일',
//                 '개인정보 수집 동의 (항목)',
//                 '개인정보 이용 목적 동의',
//                 '보유 및 이용 기간 동의',
//                 '동의 거부 권리 안내 동의',
//                 '피드백 제출 가능 여부',
//                 '연락 동의',
//                 '가장 기대하는 경험',
//                 '지치는 이유',
//                 '가장 피곤한 순간',
//                 '마음에 드는 컷 발견 후 행동'
//             ]);
//         }

//         // 데이터 행 추가
//         sheet.appendRow([
//             data.timestamp || new Date().toLocaleString('ko-KR'),
//             data.name || '',
//             data.gender || '',
//             data.phone || '',
//             data.email || '',
//             data.privacy1 || '',
//             data.privacy2 || '',
//             data.privacy3 || '',
//             data.privacy4 || '',
//             data.feedback_ready === 'yes' ? '가능' : '어려움',
//             data.contact_agreement === 'yes' ? '동의' : '비동의',
//             data.expect === 'fast' ? '빠르게 찾기' : '새로운 분위기 발견',
//             data.tired_reason === 'slow' ? '전개가 느림' : '새로움이 없음',
//             data.tired_moment === 'choice' ? '뭘 볼지 고르는 과정' : '새로운 분위기 찾기 어려움',
//             data.after_find === 'next' ? '바로 다음 컷/화로 이어서 보기' : '저장/캡쳐해서 모아두기'
//         ]);

//         // 성공 응답 반환 (no-cors 모드이므로 실제로는 읽을 수 없지만 성공 로그를 위해)
//         return ContentService.createTextOutput(JSON.stringify({
//             success: true,
//             message: '데이터가 성공적으로 저장되었습니다.'
//         })).setMimeType(ContentService.MimeType.JSON);

//     } catch (error) {
//         // 에러 응답
//         return ContentService.createTextOutput(JSON.stringify({
//             success: false,
//             error: error.toString()
//         })).setMimeType(ContentService.MimeType.JSON);
//     }
// }

// /**
//  * GET 요청을 처리하는 함수 (테스트용)
//  */
// function doGet(e) {
//     return ContentService.createTextOutput('MUMU Beta Form Handler is running!');
// }


/**
 * Google Apps Script - MUMU Beta Form Handler
 * 스프레드시트 ID: 1lH-HAMSa9493QUzQc9ZnT0Um6rgHmDj3NQaKtqUR3pA
 */

const SPREADSHEET_ID = '1ru-tOeUNEFkwAqGb05jwI_HVFQiqhO65vKnCCWl1PTD2NNRPZbc79lJI';
const SHEET_NAME = '시트1';  // 한글 시트명 확인 필요

function doPost(e) {
    try {
        Logger.log('POST 요청 받음');

        // 스프레드시트 열기
        const sheet = SpreadsheetApp
            .openById(SPREADSHEET_ID)
            .getSheetByName(SHEET_NAME);

        if (!sheet) {
            throw new Error('시트를 찾을 수 없습니다: ' + SHEET_NAME);
        }

        Logger.log('시트 연결 성공');

        // 데이터 파싱
        const raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
        Logger.log('받은 원본 데이터: ' + raw);

        const data = JSON.parse(raw);
        Logger.log('파싱된 데이터: ' + JSON.stringify(data));

        // 첫 실행시 헤더 추가
        if (sheet.getLastRow() === 0) {
            sheet.appendRow([
                '타임스탬프',
                '이름',
                '성별',
                '전화번호',
                '이메일',
                '피드백 제출 가능 여부',
                '연락 동의',
                '가장 기대하는 경험',
                '지치는 이유',
                '가장 피곤한 순간',
                '마음에 드는 컷 발견 후 행동',
                '개인정보 수집 동의',
                '개인정보 이용 목적 동의',
                '보유 및 이용 기간 동의',
                '동의 거부 권리 안내 동의'
            ]);
        }

        // 데이터 행 추가
        const rowValues = [
            data.timestamp || new Date().toLocaleString('ko-KR'),
            data.name || '',
            data.gender || '',
            data.phone || '',
            data.email || '',
            data.interview || '',
            data.agree || '',
            data.expect || '',
            data.reason || '',
            data.tired || '',
            data.behavior || '',
            data.privacy1 || '',
            data.privacy2 || '',
            data.privacy3 || '',
            data.privacy4 || ''
        ];

        const lastRow = sheet.getLastRow();

        if (lastRow < 2) {
            sheet.getRange(2, 1, 1, rowValues.length).setValues([rowValues]);
        } else {
            sheet.appendRow(rowValues);
        }

        Logger.log('데이터 저장 완료');

        // JavaScript와 일치하는 응답 형식
        return ContentService
            .createTextOutput(JSON.stringify({
                result: "success",
                message: "데이터가 성공적으로 저장되었습니다."
            }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        Logger.log('오류 발생: ' + error.toString());

        return ContentService
            .createTextOutput(JSON.stringify({
                result: "error",
                message: error.toString()
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function doGet(e) {
    return ContentService.createTextOutput('MUMU Beta Form Handler is running!');
}