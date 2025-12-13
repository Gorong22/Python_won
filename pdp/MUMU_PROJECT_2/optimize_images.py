#!/usr/bin/env python3
"""
Image optimization script for mobile web performance.
Compresses/resizes images > 500KB to < 400KB.
"""

import os
import subprocess
import sys
from pathlib import Path

def get_file_size_mb(filepath):
    """Get file size in MB"""
    return os.path.getsize(filepath) / (1024 * 1024)

def optimize_image(input_path, output_path, max_size_kb=400):
    """Optimize image using cwebp or convert (ImageMagick)"""
    try:
        # Try cwebp first (WebP optimization)
        if input_path.suffix.lower() == '.webp':
            # Use cwebp with quality adjustment
            quality = 75
            cmd = ['cwebp', '-q', str(quality), str(input_path), '-o', str(output_path)]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                size_kb = os.path.getsize(output_path) / 1024
                if size_kb > max_size_kb:
                    # Reduce quality further
                    quality = 60
                    cmd = ['cwebp', '-q', str(quality), str(input_path), '-o', str(output_path)]
                    subprocess.run(cmd, capture_output=True, text=True)
                return True
        else:
            # For non-WebP, convert to WebP
            cmd = ['cwebp', '-q', '75', str(input_path), '-o', str(output_path)]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                return True
        
        # Fallback: Use ImageMagick convert
        cmd = ['convert', str(input_path), '-quality', '75', '-resize', '1920x1080>', str(output_path)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0
        
    except FileNotFoundError:
        print(f"Warning: Image optimization tools not found. Install cwebp or ImageMagick.")
        return False
    except Exception as e:
        print(f"Error optimizing {input_path}: {e}")
        return False

def main():
    assets_dir = Path('public/assets')
    if not assets_dir.exists():
        print(f"Assets directory not found: {assets_dir}")
        return
    
    large_images = []
    total_saved = 0
    
    # Find all images > 500KB
    for ext in ['*.webp', '*.png', '*.jpg', '*.jpeg']:
        for img_path in assets_dir.rglob(ext):
            size_mb = get_file_size_mb(img_path)
            size_kb = size_mb * 1024
            
            if size_kb > 500:
                large_images.append((img_path, size_kb))
    
    if not large_images:
        print("No images > 500KB found.")
        return
    
    print(f"Found {len(large_images)} images > 500KB:")
    for img_path, size_kb in sorted(large_images, key=lambda x: x[1], reverse=True):
        print(f"  {img_path}: {size_kb:.1f} KB")
    
    # Optimize each image
    for img_path, original_size_kb in large_images:
        print(f"\nOptimizing {img_path}...")
        
        # Create backup
        backup_path = img_path.with_suffix(img_path.suffix + '.backup')
        if not backup_path.exists():
            import shutil
            shutil.copy2(img_path, backup_path)
        
        # Optimize
        if optimize_image(img_path, img_path, max_size_kb=400):
            new_size_kb = os.path.getsize(img_path) / 1024
            saved = original_size_kb - new_size_kb
            total_saved += saved
            print(f"  ✓ Optimized: {original_size_kb:.1f} KB → {new_size_kb:.1f} KB (saved {saved:.1f} KB)")
        else:
            print(f"  ✗ Failed to optimize {img_path}")
    
    print(f"\n✓ Total saved: {total_saved:.1f} KB ({total_saved/1024:.2f} MB)")

if __name__ == '__main__':
    main()
