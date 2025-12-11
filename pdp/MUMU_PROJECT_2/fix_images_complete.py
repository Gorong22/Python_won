#!/usr/bin/env python3
"""
MUMU_PROJECT_2 이미지 복구 + 빈 박스 채우기 + b1.png 완전 삭제
"""

import os
import re
import random
import shutil
from pathlib import Path
from PIL import Image

PROJECT_ROOT = Path(__file__).parent
PUBLIC_DIR = PROJECT_ROOT / "public"
ASSETS_DIR = PUBLIC_DIR / "assets"

# b1.png 삭제
def delete_b1_files():
    """b1.png/b1.webp 파일 삭제"""
    print("=" * 60)
    print("1. b1.* 파일 삭제")
    print("=" * 60)
    
    b1_files = list(ASSETS_DIR.rglob("b1.*"))
    for f in b1_files:
        print(f"삭제: {f}")
        f.unlink()
    
    print(f"✓ b1.* 파일 {len(b1_files)}개 삭제 완료\n")

# WebP 이미지 목록 가져오기
def get_webp_images():
    """사용 가능한 WebP 이미지 목록 반환"""
    feed_images = sorted([f.name for f in (ASSETS_DIR / "feed").glob("*.webp") if not f.name.startswith("b1")])
    random_images = sorted([f.name for f in (ASSETS_DIR / "random").glob("*.webp")])
    community_images = sorted([f.name for f in (ASSETS_DIR / "community-images").glob("*.webp")])
    webp_images = sorted([f.name for f in (ASSETS_DIR / "webp").glob("*.webp")])
    
    all_images = {
        "feed": feed_images,
        "random": random_images,
        "community": community_images,
        "webp": webp_images
    }
    
    return all_images

# b1.webp 참조 교체
def replace_b1_references(all_images):
    """코드에서 b1.webp 참조를 다른 이미지로 교체"""
    print("=" * 60)
    print("2. b1.webp 참조 교체")
    print("=" * 60)
    
    # b1.webp 대체용 이미지 선택 (b1 제외)
    replacement = "a1.webp"  # 기본 대체 이미지
    
    # JS 파일에서 b1.webp 제거/교체
    js_files = list(PUBLIC_DIR.rglob("*.js"))
    for js_file in js_files:
        content = js_file.read_text(encoding="utf-8")
        original = content
        
        # 배열에서 "b1.webp" 제거
        content = re.sub(r'"b1\.webp",?\s*', '', content)
        content = re.sub(r"'b1\.webp',?\s*", '', content)
        
        # 단독 참조를 대체 이미지로 교체
        content = re.sub(r'b1\.webp', replacement, content)
        
        if content != original:
            js_file.write_text(content, encoding="utf-8")
            print(f"✓ 수정: {js_file.relative_to(PROJECT_ROOT)}")
    
    print("✓ b1.webp 참조 교체 완료\n")

# 빈 이미지 박스 채우기
def fill_empty_image_boxes(all_images):
    """빈 이미지 박스에 이미지 추가"""
    print("=" * 60)
    print("3. 빈 이미지 박스 채우기")
    print("=" * 60)
    
    # 클래스별 이미지 소스 결정
    class_image_map = {
        "search-thumb": "random",
        "work-card": "random",
        "feed-thumb": "feed",
        "recommend-card": "random",
        "card-thumb": "random",
        "profile-thumb": "random",
        "comment-avatar": "random",
        "taste-card": "random",
        "result-thumb": "random",
        "creator-profile-thumb": "random",
        "creator-feed-thumb": "random",
        "myfeed-thumb": "feed",
        "feed-detail-comment-avatar": "random",
        "feed-detail-avatar": "random",
        "follow-card-avatar": "random",
        "author-avatar": "random",
        "post-avatar": "random"
    }
    
    html_files = list(PUBLIC_DIR.rglob("*.html"))
    random.shuffle(all_images["random"])  # 랜덤 순서
    
    for html_file in html_files:
        content = html_file.read_text(encoding="utf-8")
        original = content
        
        # 각 클래스에 대해 빈 div 찾기
        for class_name, folder in class_image_map.items():
            pattern = rf'<div\s+class="{re.escape(class_name)}"[^>]*>\s*</div>'
            
            def replace_empty_div(match):
                div_tag = match.group(0)
                # 이미 img가 있는지 확인
                if '<img' in div_tag:
                    return div_tag
                
                # 이미지 선택
                images = all_images.get(folder, all_images["random"])
                if not images:
                    images = all_images["random"]
                
                img_name = random.choice(images)
                img_path = f"assets/{folder}/{img_name}"
                
                # img 태그 추가
                img_tag = f'<img src="{img_path}" loading="lazy" style="object-fit: cover; width: 100%; height: 100%;" alt="" />'
                return div_tag.replace('></div>', f'>{img_tag}</div>')
            
            content = re.sub(pattern, replace_empty_div, content, flags=re.MULTILINE)
        
        if content != original:
            html_file.write_text(content, encoding="utf-8")
            print(f"✓ 수정: {html_file.relative_to(PROJECT_ROOT)}")
    
    print("✓ 빈 이미지 박스 채우기 완료\n")

# PNG → WebP 치환
def replace_png_with_webp(all_images):
    """PNG 참조를 WebP로 치환"""
    print("=" * 60)
    print("4. PNG → WebP 치환")
    print("=" * 60)
    
    files = list(PUBLIC_DIR.rglob("*.html")) + list(PUBLIC_DIR.rglob("*.js")) + list(PUBLIC_DIR.rglob("*.css"))
    
    for file in files:
        content = file.read_text(encoding="utf-8")
        original = content
        
        # .png를 .webp로 교체
        def replace_png(match):
            png_path = match.group(0)
            webp_path = png_path.replace(".png", ".webp")
            
            # 파일이 존재하는지 확인
            if "assets/" in webp_path:
                rel_path = PUBLIC_DIR / webp_path.replace("assets/", "assets/")
                if not rel_path.exists():
                    # 존재하지 않으면 랜덤 이미지로 대체
                    random_img = random.choice(all_images["random"])
                    webp_path = f"assets/random/{random_img}"
            
            return webp_path
        
        content = re.sub(r'[^/"]+\.png', replace_png, content)
        
        if content != original:
            file.write_text(content, encoding="utf-8")
            print(f"✓ 수정: {file.relative_to(PROJECT_ROOT)}")
    
    print("✓ PNG → WebP 치환 완료\n")

# 랜덤 WebP 다양화
def diversify_random_images(all_images):
    """발견탭/추천탭 이미지 다양화"""
    print("=" * 60)
    print("5. 랜덤 WebP 다양화")
    print("=" * 60)
    
    html_files = list(PUBLIC_DIR.rglob("*.html"))
    
    for html_file in html_files:
        content = html_file.read_text(encoding="utf-8")
        original = content
        
        # 섹션별로 이미지 다양화
        sections = [
            (r'<section[^>]*class="[^"]*taste-explore-section[^"]*"[^>]*>.*?</section>', "random"),
            (r'<div[^>]*class="[^"]*grid-3[^"]*"[^>]*>.*?</div>', "random"),
            (r'<section[^>]*class="[^"]*section-block[^"]*"[^>]*>.*?</section>', "random"),
            (r'<section[^>]*class="[^"]*taste-more-section[^"]*"[^>]*>.*?</section>', "random"),
            (r'<div[^>]*id="searchResults"[^>]*>.*?</div>', "random"),
            (r'<div[^>]*class="[^"]*recommend-list[^"]*"[^>]*>.*?</div>', "random"),
        ]
        
        for section_pattern, folder in sections:
            def diversify_section(match):
                section_html = match.group(0)
                
                # work-card 이미지 찾기
                work_cards = re.findall(r'<div[^>]*class="[^"]*work-card[^"]*"[^>]*>.*?</div>', section_html, re.DOTALL)
                
                if work_cards:
                    images = all_images.get(folder, all_images["random"])
                    if not images:
                        images = all_images["random"]
                    
                    # 섹션별로 이미지 셔플
                    shuffled = images.copy()
                    random.shuffle(shuffled)
                    img_index = 0
                    
                    def replace_work_card(card_match):
                        nonlocal img_index
                        card = card_match.group(0)
                        
                        # 기존 이미지 경로 추출
                        img_match = re.search(r'src="([^"]+)"', card)
                        if img_match:
                            # 새로운 이미지로 교체
                            new_img = shuffled[img_index % len(shuffled)]
                            new_path = f"assets/{folder}/{new_img}"
                            card = re.sub(r'src="[^"]+"', f'src="{new_path}"', card)
                            img_index += 1
                        elif '<img' not in card:
                            # 이미지가 없으면 추가
                            new_img = shuffled[img_index % len(shuffled)]
                            new_path = f"assets/{folder}/{new_img}"
                            img_tag = f'<img src="{new_path}" loading="lazy" style="object-fit: cover; width: 100%; height: 100%;" alt="" />'
                            card = card.replace('></div>', f'>{img_tag}</div>')
                            img_index += 1
                        
                        return card
                    
                    section_html = re.sub(r'<div[^>]*class="[^"]*work-card[^"]*"[^>]*>.*?</div>', replace_work_card, section_html, flags=re.DOTALL)
                
                return section_html
            
            content = re.sub(section_pattern, diversify_section, content, flags=re.DOTALL)
        
        # explore.html의 중복 이미지 교체
        if "explore.html" in str(html_file):
            images = all_images["random"]
            random.shuffle(images)
            img_index = 0
            
            def replace_duplicate(match):
                nonlocal img_index
                img_tag = match.group(0)
                new_img = images[img_index % len(images)]
                new_path = f"assets/random/{new_img}"
                img_index += 1
                return re.sub(r'src="[^"]+"', f'src="{new_path}"', img_tag)
            
            # 같은 이미지가 반복되는 패턴 찾기
            content = re.sub(r'<div[^>]*class="[^"]*work-card[^"]*"[^>]*>.*?</div>', replace_duplicate, content, flags=re.DOTALL)
        
        if content != original:
            html_file.write_text(content, encoding="utf-8")
            print(f"✓ 수정: {html_file.relative_to(PROJECT_ROOT)}")
    
    print("✓ 랜덤 WebP 다양화 완료\n")

# 댓글/프로필 이미지 넣기
def add_comment_profile_images(all_images):
    """댓글/프로필 아바타에 이미지 추가"""
    print("=" * 60)
    print("6. 댓글/프로필 이미지 넣기")
    print("=" * 60)
    
    html_files = list(PUBLIC_DIR.rglob("*.html"))
    profile_images = all_images.get("random", [])
    
    if not profile_images:
        profile_images = all_images.get("webp", [])
    
    for html_file in html_files:
        content = html_file.read_text(encoding="utf-8")
        original = content
        
        # 댓글/프로필 아바타 클래스
        avatar_classes = [
            "comment-avatar",
            "author-avatar",
            "post-avatar",
            "creator-profile-thumb",
            "feed-detail-comment-avatar",
            "feed-detail-avatar",
            "follow-card-avatar"
        ]
        
        for class_name in avatar_classes:
            pattern = rf'<div[^>]*class="[^"]*{re.escape(class_name)}[^"]*"[^>]*>\s*</div>'
            
            def add_avatar_img(match):
                div = match.group(0)
                if '<img' in div:
                    return div
                
                img_name = random.choice(profile_images)
                img_path = f"assets/random/{img_name}"
                img_tag = f'<img src="{img_path}" loading="lazy" style="object-fit: cover; width: 100%; height: 100%;" alt="" />'
                return div.replace('></div>', f'>{img_tag}</div>')
            
            content = re.sub(pattern, add_avatar_img, content, flags=re.MULTILINE)
        
        if content != original:
            html_file.write_text(content, encoding="utf-8")
            print(f"✓ 수정: {html_file.relative_to(PROJECT_ROOT)}")
    
    print("✓ 댓글/프로필 이미지 추가 완료\n")

# 이미지 최적화
def optimize_images():
    """큰 이미지 최적화"""
    print("=" * 60)
    print("7. 이미지 최적화")
    print("=" * 60)
    
    optimized_dir = ASSETS_DIR / "optimized"
    optimized_dir.mkdir(exist_ok=True)
    
    webp_files = list(ASSETS_DIR.rglob("*.webp"))
    optimized_count = 0
    
    for img_file in webp_files:
        try:
            with Image.open(img_file) as img:
                width, height = img.size
                
                # 1200px 이상인 경우 최적화
                if width >= 1200 or height >= 1200:
                    # 512px로 리사이즈
                    img.thumbnail((512, 512), Image.Resampling.LANCZOS)
                    
                    # optimized 폴더에 저장
                    rel_path = img_file.relative_to(ASSETS_DIR)
                    opt_path = optimized_dir / rel_path
                    opt_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    img.save(opt_path, "WEBP", quality=85)
                    optimized_count += 1
                    print(f"✓ 최적화: {rel_path}")
        except Exception as e:
            print(f"⚠ 최적화 실패: {img_file} - {e}")
    
    print(f"✓ 이미지 최적화 완료 ({optimized_count}개)\n")
    
    # 최적화된 이미지 사용하도록 경로 교체
    print("=" * 60)
    print("8. 최적화된 이미지 경로 교체")
    print("=" * 60)
    
    files = list(PUBLIC_DIR.rglob("*.html")) + list(PUBLIC_DIR.rglob("*.js"))
    
    for file in files:
        content = file.read_text(encoding="utf-8")
        original = content
        
        def replace_with_optimized(match):
            img_path = match.group(1)
            rel_path = PUBLIC_DIR / img_path
            opt_path = ASSETS_DIR / "optimized" / Path(img_path).relative_to(ASSETS_DIR)
            
            if opt_path.exists():
                return f"assets/optimized/{opt_path.relative_to(ASSETS_DIR)}"
            return img_path
        
        content = re.sub(r'assets/([^"]+\.webp)', replace_with_optimized, content)
        
        if content != original:
            file.write_text(content, encoding="utf-8")
            print(f"✓ 수정: {file.relative_to(PROJECT_ROOT)}")
    
    print("✓ 최적화된 이미지 경로 교체 완료\n")

# loading="lazy" 추가
def add_lazy_loading():
    """모든 img 태그에 loading="lazy" 추가"""
    print("=" * 60)
    print("9. loading='lazy' 추가")
    print("=" * 60)
    
    files = list(PUBLIC_DIR.rglob("*.html")) + list(PUBLIC_DIR.rglob("*.js"))
    
    for file in files:
        content = file.read_text(encoding="utf-8")
        original = content
        
        # loading 속성이 없는 img 태그에 추가
        def add_lazy(match):
            img_tag = match.group(0)
            if 'loading=' not in img_tag:
                img_tag = img_tag.replace('<img', '<img loading="lazy"')
            return img_tag
        
        content = re.sub(r'<img[^>]*>', add_lazy, content)
        
        if content != original:
            file.write_text(content, encoding="utf-8")
            print(f"✓ 수정: {file.relative_to(PROJECT_ROOT)}")
    
    print("✓ loading='lazy' 추가 완료\n")

# 메인 실행
def main():
    print("\n" + "=" * 60)
    print("MUMU_PROJECT_2 이미지 복구 + 빈 박스 채우기 + b1.png 완전 삭제")
    print("=" * 60 + "\n")
    
    # WebP 이미지 목록 가져오기
    all_images = get_webp_images()
    print(f"✓ 이미지 목록 로드 완료:")
    print(f"  - feed: {len(all_images['feed'])}개")
    print(f"  - random: {len(all_images['random'])}개")
    print(f"  - community: {len(all_images['community'])}개")
    print(f"  - webp: {len(all_images['webp'])}개\n")
    
    # 1. b1.png 삭제
    delete_b1_files()
    
    # 2. b1.webp 참조 교체
    replace_b1_references(all_images)
    
    # 3. 빈 이미지 박스 채우기
    fill_empty_image_boxes(all_images)
    
    # 4. PNG → WebP 치환
    replace_png_with_webp(all_images)
    
    # 5. 랜덤 WebP 다양화
    diversify_random_images(all_images)
    
    # 6. 댓글/프로필 이미지 넣기
    add_comment_profile_images(all_images)
    
    # 7. 이미지 최적화
    try:
        optimize_images()
    except Exception as e:
        print(f"⚠ 이미지 최적화 스킵: {e}\n")
    
    # 8. loading="lazy" 추가
    add_lazy_loading()
    
    print("=" * 60)
    print("모든 작업 완료!")
    print("=" * 60)

if __name__ == "__main__":
    main()
