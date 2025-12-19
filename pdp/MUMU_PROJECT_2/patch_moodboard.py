import os
import re

path = 'public/js/mypage_reader.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Canvas class
canvas_old = r'class Canvas {(.*?)createDOM\(\) {(.*?)this\.domElement = canvas;\n    return canvas;\n  }'
canvas_new = '''class Canvas {
  constructor(id, moodboardId, options = {}) {
    this.id = id || `canvas_${Date.now()}`;
    this.moodboardId = moodboardId;
    this.ratio = options.ratio || '1:1';
    this.template = options.template || 'freeform';
    this.background = options.background || options.backgroundColor || '#fafafa';
    this.blocks = options.blocks || [];
    this.domElement = null;
    this.thumbnail = options.thumbnail || null;
  }

  createDOM() {
    const canvas = document.createElement('div');
    canvas.className = 'canvas-instance';
    canvas.dataset.canvasId = this.id;
    canvas.dataset.moodboardId = this.moodboardId;
    canvas.dataset.ratio = this.ratio;
    canvas.style.cssText = `
      position: relative;
      width: 358px;
      aspect-ratio: ${this.ratio.replace(':', ' / ')};
      background: ${this.background};
      border: 2px solid rgba(128, 128, 128, 0.5);
      border-radius: 8px;
      margin: 0 auto;
      box-sizing: border-box;
      overflow: hidden;
    `;
    this.domElement = canvas;
    return canvas;
  }'''
content = re.sub(canvas_old, canvas_new, content, flags=re.DOTALL)

# 2. Update createBlockDOM
block_old = r'function createBlockDOM\(blockData\) {(.*?)return block;\n}'
block_new = '''function createBlockDOM(blockData) {
  const block = document.createElement('div');
  block.className = 'canvas-block';
  block.dataset.type = blockData.type;
  block.dataset.blockId = blockData.id || `block_${Date.now()}`;
  const isActive = AppState.activeBlockId === blockData.id;
  
  const rotation = blockData.rotate || blockData.rotation || 0;
  
  block.style.cssText = `
    position: absolute;
    width: ${blockData.w || blockData.width || 200}px;
    height: ${blockData.h || blockData.height || 200}px;
    left: ${blockData.x || 0}px;
    top: ${blockData.y || 0}px;
    transform: rotate(${rotation}deg);
    cursor: move;
    border: ${isActive ? '2px solid #007AFF' : '2px solid transparent'};
    border-radius: 4px;
    z-index: ${blockData.zIndex || 1};
  `;

  let contentHtml = '';
  if (blockData.type === 'text') {
    block.style.background = 'rgba(255,255,255,0.1)';
    const color = blockData.color || '#313131';
    const fontSize = blockData.fontSize || 18;
    const fontFamily = blockData.fontFamily || 'Pretendard, sans-serif';
    contentHtml = `
      <div class="text-content" contenteditable="true" style="width: 100%; height: 100%; font-size: ${fontSize}px; font-weight: 600; color: ${color}; font-family: ${fontFamily}; outline: none; word-wrap: break-word;">${blockData.content || blockData.text || '텍스트'}</div>
    `;
  } else if (blockData.type === 'image') {
    contentHtml = `<img src="${blockData.imageUrl || blockData.content?.url}" alt="Block" style="width: 100%; height: 100%; object-fit: cover;" />`;
  } else if (blockData.type === 'emoji') {
    const fontSize = blockData.fontSize || 40;
    contentHtml = `<div class="emoji-content" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px;">${blockData.emoji || '😀'}</div>`;
  }

  block.innerHTML = `
    <div class="block-content" style="width: 100%; height: 100%; position: relative;">
      ${contentHtml}
      <div class="block-controls" style="position: absolute; top: -12px; right: -12px; display: none; gap: 4px; z-index: 10;">
        <button class="canvas-block-delete" data-action="delete-block" style="width: 24px; height: 24px; background: #ff4444; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;">×</button>
        <button class="canvas-block-rotate" data-action="rotate-block" style="width: 24px; height: 24px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">↻</button>
      </div>
      <div class="canvas-block-resize-handle" style="position: absolute; bottom: -5px; right: -5px; width: 12px; height: 12px; background: #007AFF; cursor: nwse-resize; border-radius: 50%; display: none;"></div>
    </div>
  `;
  
  return block;
}'''
content = re.sub(block_old, block_new, content, flags=re.DOTALL)

# 3. Update openMoodboardEditor
open_old = r'function openMoodboardEditor\(moodboardId, template = null\) {(.*?)\n}'
open_new = '''function openMoodboardEditor(moodboardId, template = null) {
  const moodboard = AppState.moodboards.find(m => m.id === moodboardId);
  const metadata = moodboard?.metadata || {};
  const savedCanvases = metadata.canvases || [];
  const firstCanvasData = savedCanvases[0] || {};
  
  const canvas = createCanvas(moodboardId, {
    ratio: firstCanvasData.ratio || moodboard?.canvas_ratio || '1:1',
    background: firstCanvasData.background || moodboard?.backgroundColor || '#fafafa',
    blocks: firstCanvasData.blocks || moodboard?.blocks || [],
    thumbnail: firstCanvasData.thumbnail || moodboard?.thumbnail || null
  });

  setState({
    editor: { 
      isOpen: true, 
      moodboardId: moodboardId, 
      template: template || moodboard?.template || 'freeform', 
      canvasId: canvas.id,
      isFeatured: metadata.is_featured || false
    },
    activeMoodboardId: moodboardId,
    activeCanvasId: canvas.id,
    activeBlockId: null,
  });
}'''
content = re.sub(open_old, open_new, content, flags=re.DOTALL)

# 4. Update saveMoodboardEditor and createMoodboardFeed
save_old = r'async function saveMoodboardEditor\(\) {(.*?)async function createMoodboardFeed\(moodboardData\) {(.*?)\n}'
save_new = '''async function saveMoodboardEditor() {
  const isAuthenticated = await ensureAuthenticated();
  if (!isAuthenticated) return;
  const currentCanvas = getCanvas(AppState.editor.canvasId);
  if (!currentCanvas || !currentCanvas.domElement) return;

  const finalizedBlocks = Array.from(currentCanvas.domElement.querySelectorAll('.canvas-block')).map(el => {
    const type = el.dataset.type;
    const rotationMatch = el.style.transform.match(/rotate\(([^)]+)\)/);
    const base = { id: el.dataset.blockId, type: type, x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0, w: parseFloat(el.style.width) || 200, h: parseFloat(el.style.height) || 200, rotate: rotationMatch ? parseFloat(rotationMatch[1]) : 0 };
    if (type === 'text') {
      const te = el.querySelector('.text-content');
      base.content = te ? te.innerText : '';
      base.fontSize = parseInt(te?.style.fontSize) || 18;
      base.color = te?.style.color || '#333';
      base.fontFamily = te?.style.fontFamily || 'Pretendard';
    } else if (type === 'image') {
      base.imageUrl = el.querySelector('img')?.src || '';
    } else if (type === 'emoji') {
      const em = el.querySelector('.emoji-content');
      base.emoji = em ? em.innerText : '😀';
      base.fontSize = parseInt(em?.style.fontSize) || 40;
    }
    return base;
  });

  const metadata = {
    id: AppState.editor.moodboardId || `mb_${Date.now()}`,
    title: document.getElementById('editor-title-input')?.value.trim() || `무드보드`,
    is_featured: AppState.editor.isFeatured || false,
    canvases: [{ canvasId: currentCanvas.id, ratio: currentCanvas.ratio, background: currentCanvas.background, blocks: finalizedBlocks, thumbnail: currentCanvas.thumbnail }],
    activeCanvasId: currentCanvas.id,
    updated_at: new Date().toISOString()
  };

  const savedId = await createMoodboardFeed(metadata);
  if (savedId) {
    if (metadata.is_featured) {
      const client = await loadSupabaseClient();
      await client.from('reader_profiles').update({ featured_moodboard_id: savedId }).eq('user_id', AppState.currentUserId);
    }
    await loadMoodboards(); 
    closeMoodboardEditor();
  }
}

async function createMoodboardFeed(metadata) {
  const firebaseUser = await ensureFirebaseUser();
  if (!firebaseUser) return null;
  const client = await loadSupabaseClient();
  if (!client) return null;
  await client.from('user_feed_events').upsert({ user_id: firebaseUser.uid, event_type: 'moodboard_created', metadata: metadata, created_at: new Date().toISOString() }, { onConflict: 'user_id, event_type' });
  return metadata.id;
}'''
content = re.sub(save_old, save_new, content, flags=re.DOTALL)

# 5. Update UI Initializers
init_old = r'document\.getElementById\(\'btnAddText\'\)\?\.addEventListener\(\'click\', addTextBlock\);(.*?)document\.querySelector\(\'\[onclick="saveMoodboardEditor\(\)"\]\'\)\?\.addEventListener\(\'click\', saveMoodboardEditor\);'
init_new = '''document.getElementById('btnAddText')?.addEventListener('click', addTextBlock);
  document.getElementById('btnAddCut')?.addEventListener('click', () => { if (window.openCutSelectionModal) openCutSelectionModal(); });
  document.getElementById('btnAddEmoji')?.addEventListener('click', () => {
    const em = prompt('이모티콘 입력 😀'); if (em) { const c = getCanvas(AppState.editor.canvasId); c?.addBlock({ id: `block_${Date.now()}`, type: 'emoji', emoji: em, x: 100, y: 100, w: 100, h: 100 }); renderEditor(); }
  });
  document.getElementById('btnBackground')?.addEventListener('click', () => {
    const col = prompt('배경색 (#fff, black, transparent)', '#ffffff'); if (col) { const c = getCanvas(AppState.editor.canvasId); if (c) { c.background = col; if (c.domElement) c.domElement.style.background = col; } }
  });
  document.getElementById('btnFont')?.addEventListener('click', () => {
    const f = prompt('폰트명 (Pretendard, Roboto)', 'Pretendard');
    if (f && AppState.activeBlockId) { const te = getCanvas(AppState.editor.canvasId)?.domElement.querySelector(`[data-block-id="${AppState.activeBlockId}"] .text-content`); if (te) te.style.fontFamily = f; }
  });
  document.getElementById('btnFeatured')?.addEventListener('click', () => { AppState.editor.isFeatured = !AppState.editor.isFeatured; alert(AppState.editor.isFeatured ? '대표 무드보드로 설정' : '대표 설정 해제'); });
  document.querySelector('[onclick="saveMoodboardEditor()"]')?.addEventListener('click', saveMoodboardEditor);'''
content = re.sub(init_old, init_new, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
