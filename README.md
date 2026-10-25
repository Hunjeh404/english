# English Reading Studio

앱 주소: https://hunjeh404.github.io/english/

화면·기본 자료·음성 엔진은 이 저장소에서 빌드해 **GitHub Pages**로 발행합니다. 다른 사이트로 이동시키는 리디렉션 페이지가 아닙니다. 로그인·서버 보관함·원본 사진·음원은 기존 스도쿠·양치 앱과 같은 Supabase 프로젝트를 사용합니다. 다른 호스팅의 API나 저장소에 의존하지 않습니다.

## 기능

- 첨부된 두 교재 사진, 전사한 전체 본문, 영국 Emma 음성을 기본 탑재했습니다.
- 영어 텍스트는 바로 음성을 생성합니다. 사진은 Gemini로 인식한 뒤 편집·확인하고 음성을 생성합니다. 생성에는 Kokoro.js를 브라우저에서 실행하며 API 비용이 없습니다. OCR은 사용자가 설정한 Gemini 키의 무료 한도에 따릅니다. 키는 현재 탭의 sessionStorage에만 보관하고 인식 요청은 Google로 직접 보냅니다. OCR에는 오기가 남을 수 있으므로 원본 대조가 필요합니다.
- Emma·Isabella·George·Fable 영국 영어 음성을 제공합니다. 첫 사용에는 모델·런타임 다운로드가 필요합니다.
- 전체 본문을 스크롤로 표시합니다. 한 번 재생이 끝나면 1회 기록하며 자동 반복하지 않습니다. Space로 재생·정지하고 입력창에는 영향을 주지 않습니다.
- 생성 후 본문·음원·사진은 수정할 수 없습니다. 저장된 스크립트의 제목은 업로드 권한이 있는 두 계정이 나중에도 수정할 수 있고 개인 목표 횟수도 변경할 수 있습니다.
- Google 로그인 후 서버 보관함과 계정별 듣기 기록을 이용합니다. 서버 업로드·삭제는 `hyojong.yee@gmail.com`, `yelea.nho@gmail.com`만 허용합니다. 서버 RLS는 auth.users와 Google identity를 확인하며 user_metadata의 권한 주장에 의존하지 않습니다.
- 기기 음원을 재생하거나 반주로 녹음합니다. 유선·블루투스 마이크는 운영체제에 먼저 연결하고 마이크 권한을 허용한 뒤 선택합니다. 녹음 중 목소리·반주 볼륨을 독립 조절합니다. 브라우저와 OS가 장치를 지원해야 합니다.
- 결과물은 녹음 당시 믹스를 그대로 사용합니다. 완료 후 두 소스를 다시 분리 조절하지 않습니다. MP3는 320kbps, MP4는 H.264 1920×1080 정지화면과 AAC 목표 320kbps로 출력합니다. 정지화면은 전체 본문 또는 선택한 원본 이미지입니다. 변환은 FFmpeg.wasm으로 기기에서 처리합니다.
- 녹음은 다운로드 전까지 이 탭에만 보관됩니다. 페이지를 닫으면 사라집니다. 원본 품질보다 비트레이트를 높여도 손실된 음질이 복원되지는 않습니다.
- 새 음원은 40MB·20분, 원본 사진은 8장·장당 10MB, 본문은 8,000자까지 지원합니다. 업로드 음원의 시작·끝 알림은 앱 재생 시 붙이며 원본 음원 파일은 유지합니다.

## 서버 구성

Supabase의 `english_readings`, `english_completions`, `english_listening_preferences`와 비공개 `english-readings` Storage 버킷만 사용합니다. 모든 테이블에 RLS가 적용되며, 음원·사진은 로그인한 사용자에게 제한된 유효기간의 서명 URL로 전달합니다. 공개 클라이언트에는 publishable key만 포함합니다. service_role 키나 로그인 토큰은 커밋하지 않습니다.

SQL은 `supabase/migrations/`에 보관합니다. 기존 프로젝트의 다른 앱 테이블과 버킷에는 영향을 주지 않습니다. 기본 자료는 GitHub에 포함되지만 이후 사용자 업로드 자료는 Supabase에 저장됩니다. 서버 용량과 각 서비스의 무료 한도가 적용되며 무제한 무료 저장을 뜻하지는 않습니다.

Supabase Authentication → URL Configuration에 정확히 `https://hunjeh404.github.io/english/`를 허용해야 합니다. 다른 앱의 URL은 유지합니다.

## 개발·발행

Node 24, pnpm 11.25.0 기준입니다.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm dev
pnpm build
```

기본 경로는 `/english/`입니다. 개발 주소에서도 해당 경로로 엽니다. main에 변경을 올리면 `.github/workflows/pages.yml`이 검사·빌드한 dist를 GitHub Pages에 발행합니다. 저장소 Settings → Pages → Source는 GitHub Actions입니다.

Kokoro 및 변환 모델은 Apache-2.0, FFmpeg.wasm JavaScript wrapper는 MIT이며 FFmpeg 코어와 코덱의 GPL/LGPL 조건은 해당 배포본과 [소스](https://github.com/ffmpegwasm/ffmpeg.wasm)를 따릅니다. 교재의 법률 설명은 사용자가 제공한 본문으로 현행 법률 사실을 검증한 내용은 아닙니다.
