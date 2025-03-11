import { useState, useEffect } from 'react'
import './App.css'
import pptxgen from 'pptxgenjs';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API 초기화 - 환경 변수에서 로드
const API_KEY = import.meta.env.VITE_API_KEY; // Vite 환경 변수에서 API 키 가져오기
const genAI = new GoogleGenerativeAI(API_KEY);

// 간단한 API 테스트 함수
async function testGeminiAPI() {
  try {
    console.log("Gemini API 테스트 중...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("안녕하세요, 테스트 메시지입니다.");
    const response = await result.response;
    const text = response.text();
    console.log("Gemini API 테스트 성공:", text);
    return true;
  } catch (error) {
    console.error("Gemini API 테스트 실패:", error);
    return false;
  }
}

function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    lyrics: '',
    numberOfSlides: 25
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiStatus, setApiStatus] = useState<'테스트중'|'성공'|'실패'>('테스트중');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // 컴포넌트 마운트 시 로드 상태 업데이트 및 API 테스트
  useEffect(() => {
    setIsLoaded(true);
    
    // API 테스트 실행
    async function checkAPI() {
      try {
        const isSuccess = await testGeminiAPI();
        setApiStatus(isSuccess ? '성공' : '실패');
      } catch (e) {
        console.error("API 테스트 중 오류:", e);
        setApiStatus('실패');
      }
    }
    
    checkAPI();
  }, []);

  const handleStart = () => {
    setIsStarted(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'numberOfSlides' ? Math.max(1, Math.min(50, Number(value))) : value
    }));
  };

  const splitLyricsWithGemini = async (lyrics: string): Promise<string[]> => {
    if (apiStatus === '실패') {
      console.warn("Gemini API 사용 불가로 대체 함수 사용");
      return fallbackSplitLyrics(lyrics);
    }
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const prompt = `아래 가사를 반드시 정확히 ${formData.numberOfSlides}개의 부분으로 나누어주세요.
각 부분은 자연스러운 문장 단위로 나누어야 하며, 다음 규칙을 따라주세요:

1. 각 부분은 한 줄 또는 두 줄로 구성됩니다.
2. 두 줄인 경우 '/' 기호로 구분해주세요.
3. 숫자나 기호를 붙이지 말아주세요.
4. 괄호 안의 내용도 포함해주세요.
5. 반복되는 부분도 그대로 포함해주세요.
6. 반드시 ${formData.numberOfSlides}개의 부분으로 나누어야 합니다.
7. 가사가 짧더라도 ${formData.numberOfSlides}개로 나누어주세요.

가사:
${lyrics}

응답 형식:
첫 번째 부분
두 번째 부분
...와 같이 각 부분을 새로운 줄로 구분해주세요.`;
      
      console.log("\n=== 요청 정보 ===");
      console.log("요청 슬라이드 수:", formData.numberOfSlides);
      console.log("프롬프트 길이:", prompt.length);
      console.log("프롬프트 내용:");
      console.log(prompt);
      
      console.log("\n=== API 호출 중... ===");
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log("\n=== API 응답 ===");
      console.log("응답 전문:");
      console.log(text);
      
      let parts = text.split('\n').filter(line => line.trim());
      parts = parts.map(part => part.replace(/^\d+[\.\)\-]?\s*/, '').trim());
      
      console.log("\n=== 최종 처리 결과 ===");
      console.log("분할된 부분 수:", parts.length);
      console.log("각 부분 미리보기:");
      parts.forEach((part, idx) => {
        console.log(`[${idx + 1}/${parts.length}] ${part.substring(0, 50)}${part.length > 50 ? '...' : ''}`);
      });
      
      // API가 요청한 수만큼 부분을 반환하지 않은 경우
      if (parts.length !== formData.numberOfSlides) {
        console.warn(`\n⚠️ 경고: API 응답 슬라이드 수(${parts.length})가 요청 수(${formData.numberOfSlides})와 다릅니다.`);
        return fallbackSplitLyrics(lyrics);
      }
      
      return parts;
    } catch (error: unknown) {
      console.error("\n=== Gemini API 오류 ===");
      if (error instanceof Error) {
        console.error("오류 타입:", error.constructor.name);
        console.error("오류 메시지:", error.message);
        console.error("스택 트레이스:", error.stack);
      }
      console.error("전체 오류:", error);
      alert('Gemini API 호출 중 오류가 발생했습니다. 수동으로 가사를 분할합니다.');
      return fallbackSplitLyrics(lyrics);
    }
  };

  // 대체 가사 분할 함수
  const fallbackSplitLyrics = (lyrics: string): string[] => {
    console.log("\n=== 대체 분할 함수 시작 ===");
    // 먼저 줄 단위로 분할
    const lines = lyrics.split('\n').filter(line => line.trim());
    const totalParts = formData.numberOfSlides;
    const result: string[] = new Array(totalParts).fill('');
    
    if (lines.length === 0) {
      return new Array(totalParts).fill('...');
    }
    
    // 가사를 정확히 요청된 수만큼의 부분으로 나눔
    for (let i = 0; i < lines.length; i++) {
      const targetIndex = Math.floor((i * totalParts) / lines.length);
      result[targetIndex] = result[targetIndex] ? 
        `${result[targetIndex]} / ${lines[i]}` : 
        lines[i];
    }
    
    // 빈 슬라이드가 있다면 이전 슬라이드의 내용을 나눠서 채움
    for (let i = 0; i < result.length; i++) {
      if (!result[i]) {
        const prevIndex = i - 1;
        if (prevIndex >= 0 && result[prevIndex]) {
          const parts = result[prevIndex].split(' / ');
          if (parts.length > 1) {
            result[i] = parts.pop()!;
            result[prevIndex] = parts.join(' / ');
          } else {
            result[i] = '...';
          }
        } else {
          result[i] = '...';
        }
      }
    }
    
    console.log(`대체 함수로 분할 완료: ${result.length}개의 슬라이드 생성`);
    return result;
  };

  const handleCopyClick = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const generatePPT = async () => {
    try {
      setIsGenerating(true);
      
      // 사용자에게 피드백 제공
      alert(`${formData.numberOfSlides}개의 슬라이드로 구성된 Marp 코드를 생성합니다.${apiStatus === '실패' ? '\n\n(Gemini API 연결 실패로 대체 분할 방식을 사용합니다.)' : ''}`);
      
      // Marp 프레젠테이션 헤더
      let marpCode = `---
marp: true
theme: default
paginate: false
size: 16:9
style: |
  .lyrics {
    position: absolute;
    bottom: 50px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 36px;
    font-weight: bold;
    color: #333;
  }
  .slide-number {
    position: absolute;
    bottom: 20px;
    right: 20px;
    font-size: 14px;
    color: #888;
  }
  section {
    background-color:;
    display: flex;
    justify-content: center;
    align-items: center;
  }
---

<!-- _class: lead -->
# ${formData.title}
## ${formData.artist}

---\n\n`;
      
      // Lyrics Slides
      console.log("가사 분할 시작...");
      const splitLyrics = await splitLyricsWithGemini(formData.lyrics);
      console.log(`최종 생성된 슬라이드 수: ${splitLyrics.length}`);
      
      // 각 부분을 하나의 슬라이드로 변환
      splitLyrics.forEach((lyricPart, index) => {
        marpCode += `<div class="slide-number">${index + 1}</div>
<div class="lyrics">${lyricPart}</div>

---\n\n`;
      });

      // 생성된 코드 저장
      setGeneratedCode(marpCode);

      alert(`Marp 코드가 생성되었습니다!\n총 ${splitLyrics.length + 1}개의 슬라이드(제목 슬라이드 포함)가 생성되었습니다.`);
    } catch (error) {
      console.error('Marp 코드 생성 오류:', error);
      alert('Marp 코드 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 로딩 및 오류 처리
  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (isStarted) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Create Your Music Presentation</h2>
              <div className={`text-sm px-2 py-1 rounded ${
                apiStatus === '성공' ? 'bg-green-100 text-green-800' : 
                apiStatus === '실패' ? 'bg-red-100 text-red-800' : 
                'bg-yellow-100 text-yellow-800'
              }`}>
                Gemini API: {apiStatus}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-gray-700">Music Title</span>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    placeholder="Enter music title"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-700">Artist</span>
                  <input
                    type="text"
                    name="artist"
                    value={formData.artist}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    placeholder="Enter artist name"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-700">Lyrics</span>
                  <textarea
                    name="lyrics"
                    value={formData.lyrics}
                    onChange={handleInputChange}
                    rows={6}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    placeholder="Paste your lyrics here..."
                  />
                </label>
                <label className="block">
                  <span className="text-gray-700">Number of Slides</span>
                  <input
                    type="number"
                    name="numberOfSlides"
                    value={formData.numberOfSlides}
                    onChange={handleInputChange}
                    min={1}
                    max={50}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  />
                </label>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Preview</h3>
                <div className="space-y-2">
                  <p className="text-lg font-bold">{formData.title || 'Title'}</p>
                  <p className="text-gray-600">{formData.artist || 'Artist'}</p>
                  <div className="mt-4">
                    {formData.lyrics.split('\n').slice(0, 3).map((line, i) => (
                      <p key={i} className="text-sm">{line || '...'}</p>
                    ))}
                    {formData.lyrics.split('\n').length > 3 && (
                      <p className="text-sm text-gray-400">...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsStarted(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button 
                onClick={generatePPT}
                disabled={isGenerating || !formData.title || !formData.lyrics}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Generate Marp Code'}
              </button>
            </div>
          </div>
        </div>

        {/* Generated Code Preview */}
        {generatedCode && (
          <div className="mt-8 max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-700">Generated Marp Code</h3>
              <button
                onClick={handleCopyClick}
                className={`px-4 py-2 rounded-md transition-colors ${
                  copySuccess
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {copySuccess ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <div className="p-4">
              <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm font-mono whitespace-pre">
                {generatedCode}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <div className="flex justify-between items-center">
            <div className="uppercase tracking-wide text-sm text-primary font-semibold">Music PPT Maker</div>
            <div className={`text-xs px-2 py-1 rounded ${
              apiStatus === '성공' ? 'bg-green-100 text-green-800' : 
              apiStatus === '실패' ? 'bg-red-100 text-red-800' : 
              'bg-yellow-100 text-yellow-800'
            }`}>
              Gemini API: {apiStatus}
            </div>
          </div>
          <h1 className="block mt-1 text-2xl leading-tight font-bold text-black">Create Beautiful Music Presentations</h1>
          <p className="mt-2 text-gray-500">
            Transform your music ideas into stunning presentations with just a few clicks.
            {apiStatus === '실패' && <span className="block mt-1 text-red-500">※ Gemini API 연결에 실패했습니다. 수동 분할 방식으로 작동합니다.</span>}
          </p>
          <button 
            onClick={handleStart}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}

export default App

