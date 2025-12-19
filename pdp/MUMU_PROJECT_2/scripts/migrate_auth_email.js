/**
 * Firebase Auth 이메일 도메인 마이그레이션 스크립트
 *
 * 목적: 기존 @mumu.local 계정을 @mumu.app 계정으로 마이그레이션
 *
 * 실행 방법:
 * 1. Firebase 서비스 계정 키 파일을 프로젝트 루트에 serviceAccountKey.json으로 저장
 * 2. npm install (또는 yarn install)
 * 3. node scripts/migrate_auth_email.js
 *
 * 주의사항:
 * - Firestore 문서는 절대 삭제하지 않음
 * - uid는 절대 변경하지 않음
 * - 기존 @mumu.local 계정은 비활성화만 하고 삭제하지 않음
 */

const admin = require("firebase-admin");
const crypto = require("crypto");
const path = require("path");

// Firebase 서비스 계정 키 파일 경로
// 프로젝트 루트에 serviceAccountKey.json 파일을 배치해야 함
const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");

// 서비스 계정 키 파일 확인
try {
  const serviceAccount = require(serviceAccountPath);

  // Firebase Admin SDK 초기화
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || "mumu-3db59",
  });

  console.log("✅ Firebase Admin SDK 초기화 완료");
} catch (error) {
  console.error("❌ Firebase Admin SDK 초기화 실패:", error.message);
  console.error("서비스 계정 키 파일을 확인해주세요:", serviceAccountPath);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

/**
 * 랜덤 비밀번호 생성 (임시용)
 * @returns {string} 랜덤 비밀번호
 */
function generateRandomPassword() {
  // 16자리 랜덤 비밀번호 생성 (영문 대소문자 + 숫자)
  return crypto.randomBytes(8).toString("base64").slice(0, 16) + "A1!";
}

/**
 * 사용자 이메일로 Auth 계정 조회
 * @param {string} email - 이메일 주소
 * @returns {Promise<admin.auth.UserRecord|null>} 사용자 레코드 또는 null
 */
async function getUserByEmail(email) {
  try {
    const userRecord = await auth.getUserByEmail(email);
    return userRecord;
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return null;
    }
    throw error;
  }
}

/**
 * 새 Auth 계정 생성
 * @param {string} email - 이메일 주소
 * @param {string} password - 비밀번호
 * @returns {Promise<admin.auth.UserRecord>} 생성된 사용자 레코드
 */
async function createAuthUser(email, password) {
  try {
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: false, // 이메일 인증은 필요 없음 (fake email)
    });
    return userRecord;
  } catch (error) {
    throw error;
  }
}

/**
 * 기존 Auth 계정 비활성화
 * @param {string} uid - 사용자 UID
 */
async function disableAuthUser(uid) {
  try {
    await auth.updateUser(uid, {
      disabled: true,
    });
    console.log(`  ⚠️  기존 @mumu.local 계정 비활성화: ${uid}`);
  } catch (error) {
    console.error(`  ❌ 계정 비활성화 실패 (${uid}):`, error.message);
  }
}

/**
 * Firestore 문서에 auth_email 필드 추가
 * @param {string} uid - 사용자 UID
 * @param {string} authEmail - Auth 이메일 주소
 */
async function updateFirestoreAuthEmail(uid, authEmail) {
  try {
    await db
      .collection("readers")
      .doc(uid)
      .update({
        auth_email: authEmail,
        migrated_at: admin.firestore.FieldValue.serverTimestamp(),
        migrated_at_kst: new Date().toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
        }),
      });
    console.log(`  ✅ Firestore 업데이트 완료: auth_email = ${authEmail}`);
  } catch (error) {
    console.error(`  ❌ Firestore 업데이트 실패 (${uid}):`, error.message);
    throw error;
  }
}

/**
 * 마이그레이션 실행
 */
async function migrateUsers() {
  console.log("\n🚀 마이그레이션 시작...\n");

  let totalCount = 0;
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  try {
    // Firestore readers 컬렉션 전체 조회
    const readersSnapshot = await db.collection("readers").get();

    if (readersSnapshot.empty) {
      console.log("⚠️  readers 컬렉션에 문서가 없습니다.");
      return;
    }

    totalCount = readersSnapshot.size;
    console.log(`📊 총 ${totalCount}개의 사용자 문서를 발견했습니다.\n`);

    // 각 문서 처리
    for (const docSnapshot of readersSnapshot.docs) {
      const data = docSnapshot.data();
      const uid = docSnapshot.id;
      const username = data.username;

      console.log(
        `\n[${
          successCount + skipCount + errorCount + 1
        }/${totalCount}] 처리 중: ${username} (uid: ${uid})`
      );

      // 필수 필드 확인
      if (!username) {
        console.error(`  ❌ username이 없습니다. 건너뜁니다.`);
        errorCount++;
        continue;
      }

      const newEmail = `${username}@mumu.app`;
      const oldEmail = `${username}@mumu.local`;

      try {
        // 1. @mumu.app 계정이 이미 존재하는지 확인
        const existingUser = await getUserByEmail(newEmail);

        if (existingUser) {
          // 이미 @mumu.app 계정이 존재하는 경우
          if (existingUser.uid === uid) {
            // 같은 uid인 경우 - 이미 마이그레이션 완료
            console.log(`  ⏭️  이미 마이그레이션 완료된 계정입니다.`);
            skipCount++;
          } else {
            // 다른 uid인 경우 - 충돌
            console.error(
              `  ❌ 충돌: ${newEmail}가 다른 uid(${existingUser.uid})로 이미 존재합니다.`
            );
            errorCount++;
          }
          continue;
        }

        // 2. 기존 @mumu.local 계정 확인
        const oldUser = await getUserByEmail(oldEmail);
        let oldUid = null;
        if (oldUser) {
          oldUid = oldUser.uid;
          if (oldUid !== uid) {
            console.warn(
              `  ⚠️  경고: @mumu.local 계정의 uid(${oldUid})가 Firestore uid(${uid})와 다릅니다.`
            );
          }
        }

        // 3. 새 @mumu.app 계정 생성
        const tempPassword = generateRandomPassword();
        console.log(`  📝 새 Auth 계정 생성 중: ${newEmail}`);

        const newUserRecord = await createAuthUser(newEmail, tempPassword);

        if (newUserRecord.uid !== uid) {
          // 새로 생성된 계정의 uid가 Firestore uid와 다른 경우
          // 이는 심각한 문제이므로 계정을 삭제하고 중단
          console.error(
            `  ❌ 심각한 오류: 새로 생성된 Auth 계정의 uid(${newUserRecord.uid})가 Firestore uid(${uid})와 다릅니다.`
          );
          console.error(`  🗑️  생성된 계정을 삭제합니다.`);
          await auth.deleteUser(newUserRecord.uid);
          errorCount++;
          continue;
        }

        console.log(
          `  ✅ 새 Auth 계정 생성 완료: ${newEmail} (uid: ${newUserRecord.uid})`
        );

        // 4. Firestore에 auth_email 필드 추가
        await updateFirestoreAuthEmail(uid, newEmail);

        // 5. 기존 @mumu.local 계정 비활성화 (존재하는 경우)
        if (oldUid && oldUid === uid) {
          await disableAuthUser(oldUid);
        }

        successCount++;
        console.log(`  ✅ 마이그레이션 완료: ${username}`);
      } catch (error) {
        console.error(`  ❌ 마이그레이션 실패 (${username}):`, error.message);
        errorCount++;
      }
    }

    // 결과 요약
    console.log("\n" + "=".repeat(60));
    console.log("📊 마이그레이션 결과 요약");
    console.log("=".repeat(60));
    console.log(`총 처리 대상: ${totalCount}명`);
    console.log(`✅ 성공: ${successCount}명`);
    console.log(`⏭️  건너뜀: ${skipCount}명`);
    console.log(`❌ 실패: ${errorCount}명`);
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n❌ 마이그레이션 중 치명적 오류 발생:", error);
    throw error;
  }
}

// 스크립트 실행
if (require.main === module) {
  migrateUsers()
    .then(() => {
      console.log("✅ 마이그레이션 스크립트 실행 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ 마이그레이션 스크립트 실행 실패:", error);
      process.exit(1);
    });
}

module.exports = { migrateUsers };
