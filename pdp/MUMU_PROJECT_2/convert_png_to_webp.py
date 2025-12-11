#!/usr/bin/env python3
"""
PNG to WebP 변환 스크립트
- 품질: 85
- Alpha 채널 유지
- 파일 크기 비교 후 더 크면 WebP 삭제
"""

import os
import sys
from pathlib import Path
from PIL import Image

def convert_png_to_webp(png_path, quality=85):
    """PNG 파일을 WebP로 변환"""
    try:
        # PNG 파일 열기
        img = Image.open(png_path)
        
        # RGBA 모드로 변환 (alpha 채널 유지)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # WebP 파일 경로 생성
        webp_path = png_path.with_suffix('.webp')
        
        # WebP로 저장 (품질 85, lossy 압축, alpha 유지)
        img.save(webp_path, 'WEBP', quality=quality, method=6)
        
        # 파일 크기 비교
        png_size = os.path.getsize(png_path)
        webp_size = os.path.getsize(webp_path)
        
        if webp_size >= png_size:
            # WebP가 더 크면 삭제
            os.remove(webp_path)
            return False, f"WebP가 더 큼 (PNG: {png_size}, WebP: {webp_size})"
        
        return True, f"변환 성공 (PNG: {png_size}, WebP: {webp_size}, 감소: {png_size - webp_size})"
        
    except Exception as e:
        return False, f"오류: {str(e)}"

def main():
    # 현재 디렉토리에서 모든 PNG 파일 찾기
    png_files = list(Path('.').rglob('*.png'))
    
    # backup 폴더 제외
    png_files = [f for f in png_files if 'backup' not in str(f)]
    
    print(f"총 {len(png_files)}개의 PNG 파일 발견")
    print("=" * 60)
    
    converted = 0
    failed = 0
    skipped = 0
    
    for png_file in png_files:
        print(f"\n처리 중: {png_file}")
        success, message = convert_png_to_webp(png_file)
        
        if success:
            converted += 1
            print(f"✓ {message}")
        else:
            if "더 큼" in message:
                skipped += 1
                print(f"⊘ {message} (PNG 유지)")
            else:
                failed += 1
                print(f"✗ {message}")
    
    print("\n" + "=" * 60)
    print(f"변환 완료: {converted}개")
    print(f"건너뜀 (WebP가 더 큼): {skipped}개")
    print(f"실패: {failed}개")
    print(f"총 처리: {len(png_files)}개")

if __name__ == "__main__":
    main()
