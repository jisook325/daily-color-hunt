# 🎨 Color Hunt - 컬러 콜라주 앱

## 프로젝트 개요
- **이름**: Color Hunt
- **목표**: 오늘의 컬러를 찾아 9장의 사진으로 콜라주를 만드는 모바일 웹앱
- **타겟**: 커플, 친구들과 함께 즐기는 컬러 기반 사진 놀이

## 🌐 URLs
- **개발 서버**: https://3000-ixqtm590ly8ollkd242bj-6532622b.e2b.dev
- **API 베이스**: https://3000-ixqtm590ly8ollkd242bj-6532622b.e2b.dev/api
- **GitHub**: (설정 예정)
- **Cloudflare Pages**: (배포 예정)

## ✨ 현재 완성된 기능

### 🎯 핵심 기능
1. **랜덤 컬러 선택** - 9개 색상(무지개 7색 + 흰색 + 검정색) 중 랜덤 제안
2. **세션 기반 콜라주** - UUID 기반 세션 관리 (?s={uuid})
3. **실시간 카메라 촬영 + 줌 기능** - 웹 카메라를 통한 실시간 사진 촬영 및 핀치 줌 지원
4. **3x5 그리드 콜라주** - 15장의 사진을 3x5 형태로 배열 (확장됨)
5. **임시 저장** - 진행 중인 세션 자동 저장 및 복원
6. **개별 사진 관리** - 각 사진 개별 삭제 및 재촬영
7. **콜라주 완성** - 최종 이미지 생성 및 다운로드
8. **이력 조회** - 완성한 콜라주 날짜별 조회
9. **📱 핀치-투-줌** - 카메라 촬영 시 터치 제스처로 줌 인/아웃
10. **🎨 다국어 지원** - 한국어/영어 자동 전환

### 🔧 기술적 기능
- **PWA 지원** - 모바일 앱처럼 설치 및 사용 가능
- **반응형 디자인** - 모바일 우선 UI/UX
- **실시간 프로그레스** - 촬영 진행률 시각적 표시
- **미리보기** - 콜라주 완성 전 미리보기
- **오프라인 지원** - 로컬 스토리지 기반 사용자 데이터 관리
- **🎯 하드웨어 줌 + CSS 줌** - 매끄러운 2단계 줌 시스템
- **⚡ 성능 최적화** - 디바운싱 및 requestAnimationFrame 최적화
- **🛡️ 세션 보호** - IndexedDB + 로컬스토리지 이중 백업
- **💾 Dexie.js IndexedDB** - 즉시 커밋 및 Object URL 생성으로 사진 유실 방지
- **🔐 UUID 세션** - URL 쿼리 파라미터 기반 세션 관리 (?s={uuid})
- **👁️ SafeStore** - visibilitychange/pagehide 이벤트로 iOS Safari 메모리 보호
- **🖼️ Object URL 관리** - createObjectURL/revokeObjectURL 수명 주기 관리

## 🛠 기능별 API 엔드포인트

### 컬러 관리
- `POST /api/color/new` - 새로운 컬러 랜덤 선택
- 파라미터: `userId`, `excludeColor` (선택)

### 세션 관리  
- `POST /api/session/start` - 새 콜라주 세션 시작
- `GET /api/session/current/:userId` - 현재 진행 중인 세션 조회

### 사진 관리
- `POST /api/photo/add` - 사진 추가/교체
- `DELETE /api/photo/:photoId` - 개별 사진 삭제

### 콜라주 완성
- `POST /api/collage/complete` - 콜라주 완성 및 저장

### 이력 관리
- `GET /api/history/:userId` - 사용자별 콜라주 이력 조회
- `GET /api/stats/:userId` - 컬러별 통계

## 💾 데이터 아키텍처

### 데이터베이스 (Cloudflare D1)
- **collage_sessions** - 콜라주 세션 정보
- **photos** - 개별 사진 데이터 (위치, 이미지, 썸네일)
- **completed_collages** - 완성된 콜라주 메타데이터

### 클라이언트 스토리지 (IndexedDB via Dexie)
- **photos** - 사진 Blob 데이터 (id, sessionId, blob, position, createdAt)
- **sessions** - 세션 상태 (id, status, color, updatedAt)

### 스토리지 방식
- **이미지 데이터**: IndexedDB (클라이언트) + R2/D1 (서버)
- **사용자 식별**: 브라우저 로컬스토리지 기반 UUID
- **세션 관리**: URL 쿼리 파라미터 (?s={sessionId}) + IndexedDB

## 🎮 사용자 가이드

### 기본 플로우
1. **"새로운 컬러 받기"** 버튼 클릭
2. **컬러 확인** - 마음에 들면 확인, 아니면 다시 받기
3. **사진 촬영** - 해당 컬러를 찾아 15장 촬영
4. **콜라주 완성** - 15장 완료 후 최종 이미지 생성
5. **저장 및 공유** - 기기에 다운로드

### 주요 기능 사용법
- **사진 재촬영**: 촬영된 사진 클릭 → 상세보기 → 삭제 → 재촬영
- **미리보기**: 언제든지 현재 진행상황을 콜라주 형태로 미리보기
- **이력 조회**: "내 콜라주 보기"에서 과거 작품들 확인

### 🐛 디버깅 (개발자용)
iPhone Safari에서 콘솔 열기:
```javascript
// 전역 Dexie 인스턴스 확인
await db.photos.count();           // IndexedDB 사진 개수
await db.photos.toArray();         // 모든 사진 데이터

// 갤러리 DOM 상태 확인
document.querySelectorAll('.unlimited-photo-slot.filled').length;

// 시스템 상태 확인
await debugImprovedSystem();       // { sessionId, memoryPhotos, dbPhotos }
```

## 🚀 배포 정보

### 개발 환경
- **플랫폼**: Cloudflare Pages + Workers
- **프레임워크**: Hono (TypeScript)
- **데이터베이스**: Cloudflare D1 (SQLite)
- **클라이언트 DB**: Dexie.js (IndexedDB wrapper)
- **프론트엔드**: Vanilla JS + TailwindCSS

### 배포 상태
- **현재 상태**: ✅ 개발 서버 활성화
- **기술 스택**: Hono + D1 + Dexie + PWA
- **마지막 업데이트**: 2025-11-02 (IndexedDB 아키텍처 개선)

## 📋 아직 구현되지 않은 기능 (향후 계획)

### 🚨 긴급 수정 사항
- **✅ IndexedDB 아키텍처 개선** - Dexie.js 기반 즉시 커밋 시스템 (완료)
- **✅ UUID 세션 관리** - 날짜 기반 → UUID 기반 세션 전환 (완료)
- **✅ 갤러리 렌더링 수정** - 사진 촬영 후 전체 갤러리 재렌더링 (완료)
- **🔍 실제 디바이스 테스트 필요** - iPhone Safari에서 사진 유지 여부 검증 필요

### Phase 2 - 소셜 기능  
- **친구 시스템** - 팔로우 및 친구 추가
- **이미지 공유** - 친구에게 콜라주 공유
- **받은 이미지** - 친구들이 공유한 콜라주 모아보기
- **실시간 알림** - 새로운 공유 알림

### Phase 3 - 개선사항
- **컬러 가이드** - 해당 컬러 찾기 힌트
- **레이아웃 옵션** - 16:9 인스타 스토리 비율 지원
- **필터 및 효과** - 사진 필터 및 편집 기능
- **인스타그램 연동** - 직접 인스타그램 스토리 공유

## 🔧 개발자 가이드

### 로컬 개발 환경 설정
```bash
# 의존성 설치
npm install

# 로컬 데이터베이스 마이그레이션
npm run db:migrate:local

# 테스트 데이터 삽입
npm run db:seed

# 개발 서버 시작
npm run build
npm run dev:d1
```

### 주요 스크립트
- `npm run build` - 프로덕션 빌드
- `npm run dev:d1` - D1 연결된 개발 서버
- `npm run db:reset` - 데이터베이스 초기화
- `npm run deploy:prod` - Cloudflare Pages 배포

## 🎯 추천 다음 단계

### 🚨 우선순위 1 (긴급)
1. **✅ 사진 촬영 오류 해결** - 데이터베이스 외래키 제약 조건 문제 (수정 완료)
2. **✅ IndexedDB 아키텍처 개선** - Dexie.js + UUID 세션 (완료)
3. **✅ 갤러리 렌더링 수정** - 전체 사진 재렌더링 로직 추가 (완료)
4. **🔍 iPhone Safari 실제 테스트** - 사진 유지 여부 검증 필요
5. **🧪 디버깅 로그 확인** - 콘솔에서 sessionId, DB count, Object URL 생성 확인

### 📊 우선순위 2
6. **R2 스토리지 활성화** - 더 효율적인 이미지 저장
7. **PWA 아이콘 추가** - 실제 앱 아이콘 디자인 및 적용
8. **Cloudflare Pages 배포** - 프로덕션 환경 설정
9. **성능 최적화** - 이미지 압축 및 로딩 속도 개선

---

**개발 완료**: 2025-11-02 (IndexedDB 아키텍처 개선)  
**버전**: MVP 1.2 (Dexie + UUID 세션 + 갤러리 렌더링 수정)  
**상태**: 실제 디바이스 테스트 대기 중 (iPhone Safari)  
**라이선스**: MIT
