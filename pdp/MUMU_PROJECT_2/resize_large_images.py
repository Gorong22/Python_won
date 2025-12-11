#!/usr/bin/env python3
"""
큰 이미지 리사이즈 스크립트
3000px 이상 height를 가진 이미지를 512px 이하로 리사이즈
"""
import os
from pathlib import Path
from PIL import Image

PROJECT_ROOT = Path(__file__).parent
ASSETS_DIR = PROJECT_ROOT / "public" / "assets"
OPTIMIZED_DIR = ASSETS_DIR / "webp" / "optimized"

def resize_large_images():
    """3000px 이상 height를 가진 이미지를 512px 이하로 리사이즈"""
    OPTIMIZED_DIR.mkdir(parents=True, exist_ok=True)
    
    resized_count = 0
    
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
                    optimized_path = OPTIMIZED_DIR / rel_path.parent / webp_file.name
                    optimized_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    resized_img.save(optimized_path, "WEBP", quality=85)
                    print(f"✅ Resized: {webp_file.name} ({width}x{height} -> {new_width}x{new_height})")
                    resized_count += 1
        except Exception as e:
            print(f"❌ Error processing {webp_file}: {e}")
    
    print(f"\n총 {resized_count}개 이미지 리사이즈 완료")
    if resized_count > 0:
        print(f"최적화된 이미지는 {OPTIMIZED_DIR}에 저장되었습니다.")

if __name__ == "__main__":
    resize_large_images()
