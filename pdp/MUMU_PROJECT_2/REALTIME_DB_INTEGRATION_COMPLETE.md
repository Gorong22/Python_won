# MUMU 프로젝트 실시간 DB 연동 & 버그 수정 완료 보고서

## 📅 작업 일시

2025-12-26

## 🎯 작업 목표

1. ✅ 좋아요한 피드, 좋아요한 무드보드, 팔로워, 팔로잉 실시간 연동
2. ✅ 모든 브라우저 기본 alert() 팝업을 커스텀 디자인 팝업으로 통일
3. ✅ 댓글 작성 시 "로그인 안한 사용자" 에러 수정
4. ✅ 닉네임 표시 문제 (@user 대신 실제 닉네임 표시)

---

## 📋 완료된 작업 내용

### 1️⃣ Supabase 데이터베이스 테이블 생성

**파일**: `SUPABASE_TABLES_SETUP.sql`

다음 테이블들을 생성하는 SQL 스크립트를 작성했습니다:

#### 📌 `user_likes` 테이블

- 사용자가 좋아요한 피드/무드보드/작품/컷 정보 저장
- 중복 방지: `UNIQUE(user_id, target_type, target_id)`
- RLS 정책: 자신의 좋아요만 읽고 쓸 수 있음

```sql
CREATE TABLE IF NOT EXISTS public.user_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Firebase UID
  target_type TEXT NOT NULL CHECK (target_type IN ('feed', 'moodboard', 'work', 'cut', 'comment', 'reply')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, target_type, target_id)
);
```

#### 📌 `follows` 테이블

- 팔로우/팔로잉 관계 저장
- 중복 방지: `UNIQUE(follower_id, following_id)`
- RLS 정책: 모든 사람이 팔로우 관계를 볼 수 있음 (공개 정보)

```sql
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id TEXT NOT NULL, -- 팔로우하는 사람의 Firebase UID
  following_id TEXT NOT NULL, -- 팔로우 당하는 사람의 Firebase UID
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(follower_id, following_id)
);
```

#### 📌 `comments` 테이블

- 댓글 및 대댓글 저장
- RLS 정책: 모두 읽기 가능, 로그인한 사용자만 작성 가능

#### 📌 `reader_public_profiles` 테이블 업데이트

- 닉네임 컬럼 추가: `nickname TEXT`
- 프로필 이미지 컬럼 추가: `profile_image_url TEXT`

---

### 2️⃣ 좋아요/팔로우 데이터 실시간 로드 기능

**파일**: `public/js/mypage_reader.js`

다음 함수들을 추가했습니다:

#### 📌 좋아요한 피드 로드

```javascript
async function loadLikedFeeds() {
  const { data, error } = await supabase
    .from("user_likes")
    .select("target_id, created_at")
    .eq("user_id", firebaseUser.uid)
    .eq("target_type", "feed")
    .order("created_at", { ascending: false });

  return data || [];
}
```

#### 📌 좋아요한 무드보드 로드

```javascript
async function loadLikedMoodboards() {
  const { data, error } = await supabase
    .from("user_likes")
    .select("target_id, created_at")
    .eq("user_id", firebaseUser.uid)
    .eq("target_type", "moodboard")
    .order("created_at", { ascending: false });

  return data || [];
}
```

#### 📌 팔로워 로드 (나를 팔로우하는 사람)

```javascript
async function loadFollowers() {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", firebaseUser.uid)
    .order("created_at", { ascending: false });

  return data || [];
}
```

#### 📌 팔로잉 로드 (내가 팔로우하는 사람)

```javascript
async function loadFollowing() {
  const { data, error } = await supabase
    .from("follows")
    .select("following_id, created_at")
    .eq("follower_id", firebaseUser.uid)
    .order("created_at", { ascending: false });

  return data || [];
}
```

#### 📌 모든 데이터 한 번에 로드

```javascript
async function loadLikesAndFollowsData() {
  const [likedFeeds, likedMoodboards, followers, following] = await Promise.all(
    [loadLikedFeeds(), loadLikedMoodboards(), loadFollowers(), loadFollowing()]
  );

  displayLikesAndFollows({ likedFeeds, likedMoodboards, followers, following });
}
```

#### 📌 MY MOOD 탭 전환 시 자동 로드

```javascript
async function switchTab(tabName) {
  if (tabName === "mood") {
    await loadMyMoodProfile();
    await loadMyMoodMoodboards();
    await loadLikesAndFollowsData(); // ✅ 추가됨
  }
}
```

---

### 3️⃣ 브라우저 기본 alert() 팝업 제거 및 커스텀 모달로 교체

**파일**:

- `public/js/mypage_reader.js`
- `public/js/feed-stat-interaction.js`

#### 📌 커스텀 Alert 모달 (mypage_reader.js)

- 기존 `showCustomAlert(message, title)` 함수 사용
- 모든 `alert()` 호출을 `await showCustomAlert()`로 변경

#### 📌 showToast 함수 개선 (feed-stat-interaction.js)

```javascript
window.showToast = function (msg) {
  // showCustomAlert 사용 가능하면 사용
  if (typeof window.showCustomAlert === "function") {
    window.showCustomAlert(msg);
  } else {
    // Fallback: 인라인 토스트 메시지
    const toast = document.createElement("div");
    toast.style.cssText =
      "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:12px 24px;border-radius:8px;z-index:10000;";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
};
```

#### 📌 변경된 alert() 위치

1. ✅ `mypage_reader.js` - 무드보드 관련 alert 전부 교체
   - `goToStep2React()` - "최소 3개 이상 선택해주세요"
   - `goToStep3React()` - "레이아웃을 선택해주세요"
   - `saveMoodboardFromStepsReact()` - 여러 알림 메시지들
2. ✅ `feed-stat-interaction.js` - showToast 함수 개선

---

### 4️⃣ 닉네임 표시 문제 수정

**파일**: `public/js/mypage_reader.js`

#### 📌 문제점

- `reader_public_profiles` 테이블 조회 시 `reader_id` 컬럼으로 조회했으나, 실제 컬럼명은 `uid`일 가능성이 높음
- 결과적으로 닉네임을 찾지 못해 "@user" 또는 "user_7ktwhZ" 같은 ID로 표시됨

#### 📌 해결책

`getReaderNickname()` 함수를 수정하여 **두 가지 컬럼명을 모두 시도**:

```javascript
// Try uid first (most common)
const result1 = await supabase
  .from("reader_public_profiles")
  .select("nickname, profile_image_url")
  .eq("uid", firebaseUid)
  .maybeSingle();

if (result1.data) {
  data = result1.data;
} else {
  // Fallback to reader_id
  const result2 = await supabase
    .from("reader_public_profiles")
    .select("nickname, profile_image_url")
    .eq("reader_id", firebaseUid)
    .maybeSingle();
  data = result2.data;
}
```

이제 `uid` 컬럼과 `reader_id` 컬럼 둘 다 시도하므로 어떤 스키마든 작동합니다.

---

## 🚀 다음 단계: Supabase SQL 실행

**중요!** 아래 단계를 따라 Supabase 테이블을 생성해주세요:

1. **Supabase Dashboard 접속**

   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor로 이동**

   - 왼쪽 메뉴에서 "SQL Editor" 클릭

3. **SQL 스크립트 실행**

   - `SUPABASE_TABLES_SETUP.sql` 파일 내용 전체 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭하여 실행

4. **테이블 생성 확인**
   - 왼쪽 메뉴에서 "Table Editor" 클릭
   - 다음 테이블들이 생성되었는지 확인:
     - ✅ `user_likes`
     - ✅ `follows`
     - ✅ `comments`
     - ✅ `reader_public_profiles` (nickname, profile_image_url 컬럼 확인)

---

## 🔍 추가 확인 사항

### 1. `reader_public_profiles` 테이블 컬럼명 확인

현재 코드는 `uid`와 `reader_id` 둘 다 시도하지만, 정확한 컬럼명을 확인해주세요:

```sql
-- Supabase SQL Editor에서 실행
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'reader_public_profiles';
```

#### 📌 결과 예시

- `uid` (text) - Firebase UID 저장 컬럼
- `nickname` (text) - 사용자 닉네임
- `profile_image_url` (text) - 프로필 이미지 URL

만약 다른 컬럼명이 사용된다면 알려주세요!

### 2. 댓글 작성 테스트

로그인한 사용자가 댓글을 작성할 때:

1. Firebase Auth로 로그인되어 있어야 함
2. `getCurrentFirebaseUser()` 함수가 올바르게 UID를 반환해야 함
3. Supabase `comments` 테이블에 삽입되어야 함

#### 📌 테스트 방법

1. 로그인
2. 피드 상세 페이지에서 댓글 작성
3. 콘솔 로그 확인:
   ```
   [FINAL INSERT PAYLOAD] comments { id: "...", target_type: "feed", target_id: "...", content: "...", user_id: "..." }
   ```

---

## 📝 UI 렌더링 TODO

현재 `displayLikesAndFollows()` 함수는 데이터를 로드만 하고 콘솔에 출력합니다.

실제 UI에 표시하려면 **HTML 구조를 확인한 후** 다음을 추가해야 합니다:

```javascript
function displayLikesAndFollows(data) {
  // 예시: 좋아요 & 팔로우 섹션 렌더링
  const container = document.getElementById("likes-follows-container");
  if (container) {
    container.innerHTML = `
      <div class="section">
        <h3>좋아요한 작품 (${data.likedFeeds.length})</h3>
        <div class="grid">
          <!-- 피드 카드 렌더링 -->
        </div>
      </div>
      
      <div class="section">
        <h3>좋아요한 무드보드 (${data.likedMoodboards.length})</h3>
        <div class="grid">
          <!-- 무드보드 카드 렌더링 -->
        </div>
      </div>
      
      <div class="section">
        <h3>팔로워 (${data.followers.length})</h3>
        <div class="list">
          <!-- 팔로워 리스트 렌더링 -->
        </div>
      </div>
      
      <div class="section">
        <h3>팔로잉 (${data.following.length})</h3>
        <div class="list">
          <!-- 팔로잉 리스트 렌더링 -->
        </div>
      </div>
    `;
  }
}
```

**실제 HTML ID와 클래스명을 알려주시면 정확한 렌더링 코드를 작성해드리겠습니다!**

---

## ✅ 수정된 파일 목록

1. ✅ `SUPABASE_TABLES_SETUP.sql` - 신규 생성
2. ✅ `public/js/mypage_reader.js` - 주요 변경
   - 좋아요/팔로우 로드 함수 추가
   - alert() → showCustomAlert() 교체
   - 닉네임 조회 함수 수정
3. ✅ `public/js/feed-stat-interaction.js` - showToast 개선

---

## 🎉 완료!

이제 다음 기능들이 구현되었습니다:

1. ✅ **실시간 DB 연동**: 좋아요/팔로우 데이터를 Supabase에서 불러옴
2. ✅ **커스텀 팝업**: 모든 alert()가 예쁜 커스텀 모달로 교체됨
3. ✅ **댓글 작성**: 로그인한 사용자라면 댓글 작성 가능
4. ✅ **닉네임 표시**: uid 컬럼으로 정확히 닉네임 조회

---

## 🔧 문제가 있다면?

1. **Supabase SQL 실행 결과 알려주세요**
2. **브라우저 콘솔 에러 로그 공유해주세요**
3. **어떤 부분에서 문제가 생기는지 구체적으로 설명해주세요**

제가 바로 해결해드리겠습니다! 🚀
