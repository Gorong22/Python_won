# Live Server 사용 방법

## 방법 1: public 폴더를 직접 워크스페이스로 열기 (권장)

1. VS Code에서 File → Open Folder...
2. 이 폴더(/Users/mac/Python_basic/Python_won/pdp/MUMU_project_2/public) 선택
3. index.html 우클릭 → "Open with Live Server"
4. 브라우저에서 http://127.0.0.1:5500/index.html 접속

## 방법 2: Python 서버 사용

터미널에서:
```bash
cd /Users/mac/Python_basic/Python_won/pdp/MUMU_project_2/public
python3 -m http.server 5500
```

그 다음 브라우저에서 http://127.0.0.1:5500/index.html 접속
