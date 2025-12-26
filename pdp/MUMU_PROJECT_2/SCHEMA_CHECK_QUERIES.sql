📌 MUMU 프로젝트 데이터 기준 원본 문서 (Cursor 고정 참조용 / 업데이트 반영본)

⚠️ 이 문서는 유일한 진실(Source of Truth)이다.
⚠️ 코드 수정 전 반드시 이 문서를 먼저 읽고, 한 줄이라도 어기면 작업은 실패다.

0️⃣ 프로젝트 핵심 분리 원칙 (절대 고정)
Firebase Firestore

“사용자 정체성 + 이미지/상태 메타”만 담당

문서 ID는 Firebase UID(string)

관계형/콘텐츠 트랜잭션/인터랙션 저장 금지

Supabase Postgres

“콘텐츠 + 관계 + 인터랙션 + 무드보드(콘텐츠)” 전담

UUID는 콘텐츠 식별자에만 사용

사용자 식별자는 항상 Firebase UID(text)

1️⃣ Firebase Firestore Database (유저/이미지/상태)

🔥 Firebase는 “사용자 정체성 + 이미지 메타”만 담당한다
→ UUID 없음, 문서 ID = Firebase UID

🔹 readers (컬렉션)

Document ID: Firebase UID (string)

용도: 일반 사용자(독자) 프로필

주요 필드 예시:

nickname (string)

name (string)

username (string)

email (string)

createdAt (timestamp)

updatedAt (timestamp)
📌 절대 UUID로 변환하지 않는다

🔹 creators (컬렉션)

Document ID: Firebase UID (string)

용도: 작가 계정 (Firestore 기준 프로필/상태)

주요 필드 예시:

penName

profileImageUrl

status

createdAt
📌 Supabase creators.firebase_uid 와 1:1 대응

🔹 기타 Firestore 컬렉션

reader_moodboards

reader_consents

reader_settings

notifications
📌 이미지 URL, 사용자 상태, UI용 데이터만 저장
📌 비즈니스 로직/관계형 데이터 없음

2️⃣ Supabase Postgres Database (글 / 관계 / 인터랙션)

🔥 Supabase는 “콘텐츠 + 관계 + 인터랙션” 전담
→ UUID는 오직 콘텐츠 식별자에만 사용

🔐 전역 ID 규칙 (절대 변경 불가)
구분	타입	규칙
사용자 식별자	Firebase UID (text)	UUID 변환 ❌
콘텐츠 식별자	UUID	feed, cut, comment, work, moodboard 등
creator_follows.reader_id	text	Firebase UID
creator_follows.creator_id	text	Firebase UID

📌 어떤 코드도 “UID를 UUID로 캐스팅/매핑”하면 즉시 버그다.

3️⃣ Supabase 테이블 기준 (핵심 발췌)
🔹 creator_follows

id uuid PK

reader_id text NOT NULL -- Firebase UID

creator_id text NOT NULL -- Firebase UID

created_at timestamptz
📌 UUID 컬럼은 id 하나뿐
📌 Firebase UID → UUID 변환 절대 금지

🔹 creators

id text PK -- 내부 식별자(string), UUID 아님

firebase_uid text UNIQUE NOT NULL

status text

pen_name text

profile_image_url text
...
📌 id ≠ UUID
📌 Follow/Like 등에서 creators.id를 “사용자 id”로 쓰지 말 것

🔹 likes

id uuid PK

target_type text CHECK (...)

target_id uuid NOT NULL

user_id text -- Firebase UID

created_at timestamptz

🔹 comments

id uuid PK

user_id text -- Firebase UID

target_type text

target_id uuid

content text

created_at timestamptz

is_deleted boolean

🔹 comment_replies

id uuid PK

comment_id uuid

user_id text -- Firebase UID

content text

created_at timestamptz

🔹 feeds

id uuid PK

creator_id text -- creators.id (string)

ref_id uuid

is_public boolean
...

🔹 cuts

id uuid PK

work_id uuid

image_url text
...

🔹 reader_folder_cuts

id uuid PK

folder_id uuid

cut_id uuid

reader_id text -- Firebase UID
...

3.1️⃣ (추가/확정) Moodboard 데이터 모델 — “자유형 vs 템플릿” 분리 저장

🔥 무드보드는 Supabase의 “콘텐츠”다 (UUID 사용)

🔹 moodboards (중요 컬럼)

id uuid PK

owner_id text NOT NULL -- Firebase UID (text)

title text NOT NULL

description text

is_public boolean

cover_block_id uuid

thumbnail_url text

featured_thumbnail_url text

✅ 추가 완료(확정)

layout_type text DEFAULT 'free' -- 'free' | 'template'

template_id text -- 예: 'grid_6', 'clean_grid_4' ...

📌 자유형과 템플릿은 “섞어서 복원”하면 안 된다.

free: 사용자가 배치한 레이아웃(자유 드래그 기반)

template: 슬롯 기반(템플릿 id + 슬롯 매핑 기반)

🔹 moodboard_blocks

id uuid PK

moodboard_id uuid NOT NULL

block_type text CHECK ('cut','text','quote')

cut_id uuid NULL

order_index int

owner_id text NOT NULL -- Firebase UID (text)

layout jsonb -- 배치 정보 저장(자유형/템플릿 공용 가능하나 “의미가 다름”)
...

📌 같은 layout이라도 의미가 다르다:

free: x/y/w/h/rotation 등 “자유 배치”

template: slot_id 또는 slot role 등 “슬롯 매핑” 정보가 핵심(없으면 복원 불가)

4️⃣ RLS 정책 핵심 (절대 전제)
✅ 핵심 결론

이 프로젝트는 “Supabase Auth의 auth.uid()(UUID)”가 아니라,

Custom JWT의 sub(=Firebase UID text) 를 기준으로 RLS가 짜여있다.

즉 정책/쿼리에서 사용자 비교는 원칙적으로:

auth.jwt()->>'sub' (text) 를 사용한다.

🔹 moodboards 정책(현재 확인된 형태)

SELECT: is_public = true OR owner_id = (auth.jwt() ->> 'sub')

INSERT: WITH CHECK owner_id = (auth.jwt() ->> 'sub')

UPDATE/DELETE: owner_id = (auth.jwt() ->> 'sub')

📌 콘솔 SQL Editor에서는 auth.jwt()가 NULL일 수 있다(로그인 컨텍스트 없음).
→ 콘솔 테스트는 반드시 owner_id를 문자열로 직접 넣어서 검증한다.

5️⃣ Cursor 작업 절대 규칙 (강제)
❌ 절대 하면 안 되는 것

Firebase UID → UUID 변환

users / readers 테이블에서 UUID 조회

creator_follows에 UUID insert

“22P02 = 스키마가 UUID” 같은 추론으로 구조를 바꾸는 행위

자유형/템플릿 로직을 하나로 섞어서 “공통 복원”하려는 시도

✅ 반드시 지킬 것

사용자는 항상 Firebase UID(text)

콘텐츠는 UUID

moodboard는 layout_type 으로 저장/로딩/렌더링/수정 진입을 분기한다

free: 자유 배치 복원

template: template_id + 슬롯 매핑 복원