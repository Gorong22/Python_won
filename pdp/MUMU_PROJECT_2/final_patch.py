import os
import re

path = 'public/js/mypage_reader.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Final check for openCutSelectionModal
if 'function openCutSelectionModal' not in content:
    cut_modal_code = '''
function openCutSelectionModal() {
  const cuts = typeof window.getAllCutsFromFolders === 'function' ? window.getAllCutsFromFolders() : [];
  if (cuts.length === 0) {
    alert('저장된 컷이 없습니다. 먼저 컷을 저장해주세요.');
    return;
  }
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; align-items:center; justify-content:center;';
  modal.innerHTML = `
    <div style="background:white; width:90%; max-width:400px; max-height:80%; border-radius:12px; overflow:hidden; display:flex; flex-direction:column;">
      <div style="padding:16px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0; font-size:16px;">컷 선택</h3>
        <button onclick="this.closest('div').parentElement.parentElement.remove()" style="border:none; background:none; font-size:20px; cursor:pointer;">&times;</button>
      </div>
      <div id="modal-cuts-grid" style="padding:12px; display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; overflow-y:auto; flex:1;">
        ${cuts.map(cut => `<img src="${cut.url}" onclick="window.addImageBlock('${cut.url}'); this.closest('div').parentElement.parentElement.remove();" style="width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:4px; cursor:pointer;" />`).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
window.openCutSelectionModal = openCutSelectionModal;
'''
    content += cut_modal_code

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
