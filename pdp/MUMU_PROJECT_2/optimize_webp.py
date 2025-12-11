#!/usr/bin/env python3
"""
WebP 파일 추가 압축 스크립트
목표: 각 파일을 최대 200KB 이하로, 품질 70-85 자동 조정
"""

import os
from pathlib import Path
from PIL import Image

def optimize_webp(webp_path, target_size_kb=200):
    """WebP 파일을 목표 크기 이하로 압축"""
    try:
        target_size_bytes = target_size_kb * 1024
        current_size = os.path.getsize(webp_path)
        
        # 이미 목표 크기 이하면 스킵
        if current_size <= target_size_bytes:
            return True, f"이미 최적화됨 ({current_size} bytes)"
        
        # 이미지 열기
        img = Image.open(webp_path)
        
        # RGBA 모드 유지
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # 품질을 점진적으로 낮춰가며 시도
        for quality in range(85, 60, -5):
            img.save(webp_path, 'WEBP', quality=quality, method=6)
            new_size = os.path.getsize(webp_path)
            
            if new_size <= target_size_bytes:
                return True, f"최적화 완료 (품질: {quality}, {current_size} -> {new_size} bytes)"
        
        # 여전히 크면 더 낮은 품질로
        for quality in range(60, 40, -5):
            img.save(webp_path, 'WEBP', quality=quality, method=6)
            new_size = os.path.getsize(webp_path)
            
            if new_size <= target_size_bytes:
                return True, f"강력 최적화 완료 (품질: {quality}, {current_size} -> {new_size} bytes)"
        
        final_size = os.path.getsize(webp_path)
        return True, f"최적화 시도 (품질: 40, {current_size} -> {final_size} bytes, 목표 미달)"
        
    except Exception as e:
        return False, f"오류: {str(e)}"

def main():
    # 모든 WebP 파일 찾기
    webp_files = list(Path('.').rglob('*.webp'))
    
    # backup 폴더 제외
    webp_files = [f for f in webp_files if 'backup' not in str(f)]
    
    print(f"총 {len(webp_files)}개의 WebP 파일 발견")
    print("=" * 60)
    
    optimized = 0
    skipped = 0
    failed = 0
    
    for webp_file in webp_files:
        print(f"\n처리 중: {webp_file}")
        success, message = optimize_webp(webp_file)
        
        if success:
            if "이미 최적화됨" in message:
                skipped += 1
                print(f"⊘ {message}")
            else:
                optimized += 1
                print(f"✓ {message}")
        else:
            failed += 1
            print(f"✗ {message}")
    
    print("\n" + "=" * 60)
    print(f"최적화 완료: {optimized}개")
    print(f"건너뜀 (이미 최적화됨): {skipped}개")
    print(f"실패: {failed}개")
    print(f"총 처리: {len(webp_files)}개")

if __name__ == "__main__":
    main()
