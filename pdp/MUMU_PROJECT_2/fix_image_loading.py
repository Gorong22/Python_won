#!/usr/bin/env python3
"""
MUMU_PROJECT_2 이미지 로딩 복구 스크립트
- 빈 이미지 컨테이너에 img 태그 자동 삽입
- PNG → WebP 경로 치환
- loading="lazy" 추가
- 큰 이미지 리사이즈
"""

import os
import re
import random
from pathlib import Path
from PIL import Image

PROJECT_ROOT = Path(__file__).parent
PUBLIC_DIR = PROJECT_ROOT / "public"
ASSETS_DIR = PUBLIC_DIR / "assets"
RANDOM_DIR = ASSETS_DIR / "random"

# 빈 이미지 컨테이너 클래스 목록
EMPTY_CONTAINER_CLASSES = [
    "search-thumb",
    "work-card",
    "recommend-card",
    "feed-thumb",
    "card-thumb",
    "myfeed-thumb",
    "creator-feed-thumb"
]

def get_random_webp():
    """random 폴더에서 랜덤 webp 파일 경로 반환"""
    if not RANDOM_DIR.exists():
        return None
    webp_files = list(RANDOM_DIR.glob("*.webp"))
    if not webp_files:
        return None
    return f"assets/random/{random.choice(webp_files).name}"

def fix_empty_containers_in_html(html_content):
    """HTML에서 빈 이미지 컨테이너에 img 태그 삽입"""
    random_webp = get_random_webp()
    if not random_webp:
        return html_content
    
    for class_name in EMPTY_CONTAINER_CLASSES:
        # <div class="class-name"></div> 패턴 찾기
        pattern = rf'(<div\s+class="{re.escape(class_name)}"[^>]*>)\s*</div>'
        replacement = rf'\1<img src="{random_webp}" loading="lazy" style="object-fit: cover; width: 100%; height: 100%;" alt="" /></div>'
        html_content = re.sub(pattern, replacement, html_content)
        
        # <div class="class-name"></div> (공백 없음)
        pattern = rf'(<div\s+class="{re.escape(class_name)}"[^>]*>)</div>'
        replacement = rf'\1<img src="{random_webp}" loading="lazy" style="object-fit: cover; width: 100%; height: 100%;" alt="" /></div>'
        html_content = re.sub(pattern, replacement, html_content)
    
    return html_content

def fix_empty_containers_in_js(js_content):
    """JS에서 빈 이미지 컨테이너 생성 코드에 img 태그 추가"""
    random_webp = get_random_webp()
    if not random_webp:
        return js_content
    
    # search-thumb 패턴 찾기 (explore.js) - 템플릿 리터럴 내부
    pattern = r'(<div\s+class="search-thumb"></div>)'
    replacement = rf'<div class="search-thumb"><img src="{random_webp}" loading="lazy" style="object-fit: cover; width: 100%; height: 100%;" alt="" /></div>'
    js_content = re.sub(pattern, replacement, js_content)
    
    # work-card 패턴도 처리
    pattern = r'(<div\s+class="work-card"></div>)'
    replacement = rf'<div class="work-card"><img src="{random_webp}" loading="lazy" style="object-fit: cover; width: 100%; height: 100%;" alt="" /></div>'
    js_content = re.sub(pattern, replacement, js_content)
    
    return js_content

def replace_png_with_webp(content):
    """PNG 경로를 WebP로 치환"""
    random_webp = get_random_webp()
    if not random_webp:
        random_webp = "assets/random/placeholder.webp"
    
    # .png를 .webp로 치환 (경로 내)
    def replace_png(match):
        path = match.group(0)
        # 이미 .webp인 경우 스킵
        if '.webp' in path:
            return path
        # .png를 .webp로 치환
        new_path = path.replace('.png', '.webp')
        # 파일이 존재하는지 확인
        if '.png' in path:
            # 원본 경로에서 .webp 버전 확인
            png_path = Path(PUBLIC_DIR) / path.replace('assets/', 'assets/').replace('public/', '')
            webp_path = png_path.with_suffix('.webp')
            if webp_path.exists():
                return new_path
            else:
                # 없으면 random webp 사용
                return random_webp
        return path
    
    # 문자열 리터럴 내의 .png 치환
    content = re.sub(r'(["\'])([^"\']*\.png)(["\'])', lambda m: f'{m.group(1)}{m.group(2).replace(".png", ".webp")}{m.group(3)}', content)
    
    # 일반 경로에서 .png 치환
    content = re.sub(r'([^\s"\'<>]+)\.png([^\w])', lambda m: m.group(1) + '.webp' + m.group(2), content)
    
    return content

def add_lazy_loading(content):
    """모든 img 태그에 loading="lazy" 추가 (없는 경우만)"""
    # loading 속성이 없는 img 태그 찾기
    pattern = r'(<img)((?![^>]*\bloading\s*=)[^>]*)(>)'
    def add_loading(match):
        attrs = match.group(2)
        if 'loading=' not in attrs:
            return f'<img{attrs} loading="lazy">'
        return match.group(0)
    
    content = re.sub(pattern, add_loading, content)
    return content

def resize_large_images():
    """3000px 이상 height를 가진 이미지를 512px 이하로 리사이즈"""
    optimized_dir = ASSETS_DIR / "webp" / "optimized"
    optimized_dir.mkdir(parents=True, exist_ok=True)
    
    # 모든 webp 파일 검색
    for webp_file in ASSETS_DIR.rglob("*.webp"):
        try:
            with Image.open(webp_file) as img:
                width, height = img.size
                
                # height가 3000px 이상이면 리사이즈
                if height > 3000:
                    # 비율 유지하며 최대 height 512px로 리사이즈
                    new_height = 512
                    new_width = int(width * (new_height / height))
                    
                    resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    
                    # optimized 폴더에 저장
                    rel_path = webp_file.relative_to(ASSETS_DIR)
                    optimized_path = optimized_dir / rel_path.parent / webp_file.name
                    optimized_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    resized_img.save(optimized_path, "WEBP", quality=85)
                    print(f"Resized: {webp_file.name} ({width}x{height} -> {new_width}x{new_height})")
        except Exception as e:
            print(f"Error processing {webp_file}: {e}")

def fix_tabbar_svg():
    """탭바 SVG 경로 확인 및 수정"""
    tabbar_path = PUBLIC_DIR / "components" / "tabbar.html"
    if not tabbar_path.exists():
        return
    
    content = tabbar_path.read_text(encoding='utf-8')
    
    # SVG 파일 경로 확인 및 수정
    svg_pattern = r'src="assets/icons/([^"]+\.svg)"'
    
    def check_svg_path(match):
        svg_name = match.group(1)
        svg_path = ASSETS_DIR / "icons" / svg_name
        
        if svg_path.exists():
            return match.group(0)  # 경로가 정상이면 그대로
        else:
            # SVG 파일이 없으면 inline SVG로 대체하거나 경로 수정
            print(f"Warning: SVG file not found: {svg_path}")
            return match.group(0)  # 일단 경로는 유지
    
    content = re.sub(svg_pattern, check_svg_path, content)
    tabbar_path.write_text(content, encoding='utf-8')

def process_file(file_path):
    """파일 처리"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original_content = content
        
        # HTML 파일 처리
        if file_path.suffix == '.html':
            content = fix_empty_containers_in_html(content)
            content = replace_png_with_webp(content)
            content = add_lazy_loading(content)
        
        # JS 파일 처리
        elif file_path.suffix == '.js':
            content = fix_empty_containers_in_js(content)
            content = replace_png_with_webp(content)
        
        # 변경사항이 있으면 저장
        if content != original_content:
            file_path.write_text(content, encoding='utf-8')
            print(f"Fixed: {file_path.relative_to(PROJECT_ROOT)}")
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """메인 함수"""
    print("Starting image loading fix...")
    
    # 1. random 폴더 확인
    if not RANDOM_DIR.exists() or not list(RANDOM_DIR.glob("*.webp")):
        print("Warning: random folder is empty. Creating sample webp files...")
        # feed 폴더에서 webp 복사
        feed_dir = ASSETS_DIR / "feed"
        if feed_dir.exists():
            webp_files = list(feed_dir.glob("*.webp"))[:10]
            for webp_file in webp_files:
                dest = RANDOM_DIR / webp_file.name
                dest.parent.mkdir(parents=True, exist_ok=True)
                import shutil
                shutil.copy2(webp_file, dest)
    
    # 2. HTML 파일 처리
    html_files = list(PUBLIC_DIR.rglob("*.html"))
    for html_file in html_files:
        process_file(html_file)
    
    # 3. JS 파일 처리
    js_files = list((PUBLIC_DIR / "js").rglob("*.js"))
    for js_file in js_files:
        process_file(js_file)
    
    # 4. 탭바 SVG 수정
    fix_tabbar_svg()
    
    # 5. 큰 이미지 리사이즈
    print("Resizing large images...")
    resize_large_images()
    
    print("Done!")

if __name__ == "__main__":
    main()
