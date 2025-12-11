#!/usr/bin/env python3
"""
코드 파일에서 PNG 경로를 WebP로 자동 치환
"""

import os
import re
from pathlib import Path

def replace_png_to_webp(content):
    """PNG 확장자를 webp로 치환"""
    # 다양한 패턴 처리
    patterns = [
        # .png -> .webp (일반적인 경우)
        (r'\.png', '.webp'),
        # "file.png" -> "file.webp"
        (r'"([^"]+)\.png"', r'"\1.webp"'),
        # 'file.png' -> 'file.webp'
        (r"'([^']+)\.png'", r"'\1.webp'"),
        # /path/to/file.png -> /path/to/file.webp
        (r'([^\s"\'<>]+)\.png', r'\1.webp'),
    ]
    
    # 가장 안전한 방법: .png를 .webp로 직접 치환
    # 하지만 경로나 문자열 내부에만 적용되도록 주의
    result = content
    
    # 문자열 리터럴 내의 .png를 .webp로 치환
    # 따옴표로 감싸진 문자열 내부만 치환
    result = re.sub(r'("([^"]*)\.png")', lambda m: m.group(0).replace('.png', '.webp'), result)
    result = re.sub(r"('([^']*)\.png')", lambda m: m.group(0).replace('.png', '.webp'), result)
    
    # 따옴표 없는 경우도 처리 (HTML src, CSS url 등)
    result = re.sub(r'([^\s"\'<>]+)\.png([^\w])', r'\1.webp\2', result)
    
    return result

def process_file(file_path):
    """파일을 읽어서 PNG를 WebP로 치환하고 저장"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        new_content = replace_png_to_webp(content)
        
        if original_content != new_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True, "수정됨"
        else:
            return False, "변경 없음"
    except Exception as e:
        return False, f"오류: {str(e)}"

def main():
    # 처리할 파일 확장자
    extensions = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css']
    
    # 현재 디렉토리에서 모든 파일 찾기
    files_to_process = []
    for ext in extensions:
        files_to_process.extend(Path('.').rglob(f'*{ext}'))
    
    # backup 폴더 제외
    files_to_process = [f for f in files_to_process if 'backup' not in str(f) and 'node_modules' not in str(f)]
    
    print(f"총 {len(files_to_process)}개의 파일 발견")
    print("=" * 60)
    
    modified = 0
    unchanged = 0
    errors = 0
    modified_files = []
    
    for file_path in files_to_process:
        success, message = process_file(file_path)
        
        if success:
            modified += 1
            modified_files.append(str(file_path))
            print(f"✓ {file_path}: {message}")
        elif "오류" in message:
            errors += 1
            print(f"✗ {file_path}: {message}")
        else:
            unchanged += 1
    
    print("\n" + "=" * 60)
    print(f"수정됨: {modified}개")
    print(f"변경 없음: {unchanged}개")
    print(f"오류: {errors}개")
    print(f"\n수정된 파일 목록:")
    for f in modified_files:
        print(f"  - {f}")

if __name__ == "__main__":
    main()
