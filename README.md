# Music PPT Maker

가사를 입력하면 Marp 프레젠테이션 코드를 생성하는 웹 애플리케이션입니다.

## 기능

- 가사를 입력하면 자동으로 25개의 슬라이드로 분할
- Google Gemini AI를 활용한 자연스러운 가사 분할
- Marp 마크다운 형식의 프레젠테이션 코드 생성
- 생성된 코드를 쉽게 복사하여 사용 가능

## 사용 방법

1. [웹사이트](https://[your-username].github.io/music-ppt-maker/)에 접속합니다.
2. 음악 제목과 아티스트 이름을 입력합니다.
3. 가사를 입력합니다.
4. "Generate Marp Code" 버튼을 클릭합니다.
5. 생성된 Marp 코드를 복사하여 사용합니다.

## 로컬에서 실행하기

```bash
# 저장소 클론
git clone https://github.com/[your-username]/music-ppt-maker.git
cd music-ppt-maker

# 의존성 설치
npm install

# 환경 변수 설정
# .env 파일을 생성하고 아래 내용을 추가합니다
VITE_GEMINI_API_KEY=your_api_key_here

# 개발 서버 실행
npm run dev
```

## 기술 스택

- React
- TypeScript
- Vite
- Tailwind CSS
- Google Gemini AI
- Marp

## 라이선스

MIT License
