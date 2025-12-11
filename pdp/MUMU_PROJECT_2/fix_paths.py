#!/usr/bin/env python3
"""
모든 HTML 파일의 경로를 절대 경로로 변경하는 스크립트
"""
import os
import re
from pathlib import Path

def fix_paths_in_file(file_path):
    """파일 내의 모든 상대 경로를 절대 경로로 변경"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # CSS 경로 수정
    content = re.sub(r'href=["\']css/', 'href="/public/css/', content)
    
    # JS 경로 수정
    content = re.sub(r'src=["\']js/', 'src="/public/js/', content)
    
    # Assets 경로 수정 (이미지 등)
    content = re.sub(r'src=["\']assets/', 'src="/public/assets/', content)
    content = re.sub(r'href=["\']assets/', 'href="/public/assets/', content)
    
    # Components 경로 수정
    content = re.sub(r'fetch\(["\']components/', 'fetch("/public/components/', content)
    content = re.sub(r'src=["\']components/', 'src="/public/components/', content)
    content = re.sub(r'href=["\']components/', 'href="/public/components/', content)
    
    # HTML 페이지 링크 수정 (같은 폴더 내 파일들)
    html_files = ['community.html', 'creator_feed.html', 'creator_dashboard.html', 
                  'mypage_reader.html', 'mypage_creator.html', 'store.html', 
                  'explore.html', 'login.html', 'signup.html', 'splash.html',
                  'feed_upload.html', 'upload.html', 'onboarding_creator.html',
                  'onboarding_reader.html', 'reader_creator_feed.html']
    
    for html_file in html_files:
        # href="filename.html" 또는 href='filename.html' 패턴
        pattern = rf'href=["\']{re.escape(html_file)}["\']'
        replacement = f'href="/public/{html_file}"'
        content = re.sub(pattern, replacement, content)
    
    # index.html 링크를 /index.html로 (절대 경로)
    content = re.sub(r'href=["\']index\.html["\']', 'href="/index.html"', content)
    content = re.sub(r'href=["\']\.\./index\.html["\']', 'href="/index.html"', content)
    
    # 변경사항이 있으면 파일 저장
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """메인 함수"""
    base_dir = Path(__file__).parent
    public_dir = base_dir / 'public'
    
    # components 폴더 제외하고 모든 HTML 파일 처리
    html_files = list(public_dir.glob('*.html'))
    
    modified_count = 0
    for html_file in html_files:
        if fix_paths_in_file(html_file):
            print(f"✓ Fixed: {html_file.name}")
            modified_count += 1
        else:
            print(f"  No changes: {html_file.name}")
    
    print(f"\n총 {modified_count}개 파일 수정됨")

if __name__ == '__main__':
    main()
