#!/usr/bin/env python3
"""
모든 JS 파일의 경로를 절대 경로로 변경하는 스크립트
"""
import os
import re
from pathlib import Path

def fix_paths_in_js_file(file_path):
    """JS 파일 내의 모든 상대 경로를 절대 경로로 변경"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # fetch("components/...") → fetch("/public/components/...")
    content = re.sub(r'fetch\(["\']components/', 'fetch("/public/components/', content)
    
    # fetch("data/...") → fetch("/public/data/...")
    content = re.sub(r'fetch\(["\']data/', 'fetch("/public/data/', content)
    
    # src="assets/ → src="/public/assets/
    content = re.sub(r'src=["\']assets/', 'src="/public/assets/', content)
    
    # href="assets/ → href="/public/assets/
    content = re.sub(r'href=["\']assets/', 'href="/public/assets/', content)
    
    # href="../index.html" 또는 href="index.html" → href="/index.html"
    content = re.sub(r'href=["\']\.\./index\.html["\']', 'href="/index.html"', content)
    content = re.sub(r'href=["\']index\.html["\']', 'href="/index.html"', content)
    
    # href="upload.html" 등 → href="/public/upload.html"
    html_files = ['upload.html', 'community.html', 'creator_feed.html', 
                  'creator_dashboard.html', 'mypage_reader.html', 
                  'mypage_creator.html', 'store.html', 'explore.html']
    
    for html_file in html_files:
        pattern = rf'href=["\']{re.escape(html_file)}["\']'
        replacement = f'href="/public/{html_file}"'
        content = re.sub(pattern, replacement, content)
    
    # assets/feed/ → /public/assets/feed/
    content = re.sub(r'assets/feed/', '/public/assets/feed/', content)
    content = re.sub(r'["\']assets/random/', '"/public/assets/random/', content)
    content = re.sub(r'["\']assets/logos/', '"/public/assets/logos/', content)
    content = re.sub(r'["\']assets/community-images/', '"/public/assets/community-images/', content)
    
    # 변경사항이 있으면 파일 저장
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """메인 함수"""
    base_dir = Path(__file__).parent
    js_dir = base_dir / 'public' / 'js'
    
    js_files = list(js_dir.glob('*.js'))
    
    modified_count = 0
    for js_file in js_files:
        if fix_paths_in_js_file(js_file):
            print(f"✓ Fixed: {js_file.name}")
            modified_count += 1
        else:
            print(f"  No changes: {js_file.name}")
    
    print(f"\n총 {modified_count}개 JS 파일 수정됨")

if __name__ == '__main__':
    main()
