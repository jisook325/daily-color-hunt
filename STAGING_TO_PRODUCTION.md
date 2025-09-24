# 🚀 스테이징 → 프로덕션 마이그레이션 가이드

## 📋 개요
이 가이드는 스테이징 환경에서 테스트된 Google OAuth 인증 시스템을 안전하게 프로덕션 환경으로 마이그레이션하는 방법을 설명합니다.

## 🏗️ 현재 환경 구성

### 프로덕션 환경 (포트 3000)
- **URL**: https://3000-ixqtm590ly8ollkd242bj-6532622b.e2b.dev
- **상태**: 기존 사용자 서비스 중 (인증 없음)
- **데이터**: 기존 사용자 세션 및 콜라주 데이터 보존

### 스테이징 환경 (포트 3001)  
- **URL**: https://3001-ixqtm590ly8ollkd242bj-6532622b.e2b.dev
- **상태**: Google OAuth + Guest Mode 인증 시스템 테스트 완료
- **데이터**: 테스트 데이터 (마이그레이션 후 정리)

## ✅ 마이그레이션 전 체크리스트

### 1. 스테이징 환경 완전 테스트
- [ ] Google OAuth 로그인 플로우 정상 작동
- [ ] Guest 모드 정상 작동  
- [ ] JWT 토큰 생성/검증 정상
- [ ] 인증된 API 엔드포인트 정상 작동
- [ ] 사용자 데이터 저장 정상
- [ ] 콜라주 생성 플로우 정상

### 2. 프로덕션 환경 백업
- [ ] 현재 D1 데이터베이스 백업
- [ ] R2 스토리지 파일 백업 (필요시)
- [ ] 현재 소스코드 Git 커밋

### 3. Google OAuth 설정 확인
- [ ] 프로덕션 도메인 (https://colorhunt.app) Redirect URI 설정됨
- [ ] Client Secret 환경변수 프로덕션에 설정됨

## 🚀 마이그레이션 단계

### Step 1: 프로덕션 데이터베이스 마이그레이션
```bash
# 1. 프로덕션 D1 데이터베이스에 인증 테이블 추가
npx wrangler d1 migrations apply color-hunt-db --remote

# 2. 기존 사용자 데이터를 새 시스템으로 마이그레이션 (옵션)
# 필요시 별도 마이그레이션 스크립트 실행
```

### Step 2: 프로덕션 환경변수 설정
```bash
# Cloudflare Pages 시크릿 설정
npx wrangler secret put GOOGLE_CLIENT_SECRET --env production
# 값: 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
```

### Step 3: 무중단 배포 전략

#### 옵션 A: 점진적 롤아웃 (권장)
```bash
# 1. 새 브랜치에서 프로덕션 배포
git checkout -b production-auth
git merge staging-auth

# 2. 별도 Cloudflare Pages 프로젝트로 배포
npx wrangler pages deploy dist --project-name color-hunt-auth

# 3. 도메인 확인 후 기존 프로젝트와 교체
```

#### 옵션 B: 직접 업데이트
```bash
# 1. 현재 프로덕션 서비스 중지
pm2 stop color-hunt

# 2. 소스코드 업데이트 (스테이징 → 프로덕션)
# 인증 코드를 메인 브랜치에 머지

# 3. 프로덕션 재시작
pm2 restart color-hunt
```

### Step 4: 기존 사용자 데이터 마이그레이션 (선택사항)

#### 기존 deviceId → 새로운 user 시스템 마이그레이션
```sql
-- 기존 사용자를 게스트 계정으로 변환
INSERT INTO users (id, email, name, picture, type, device_id, created_at, updated_at, last_login_at)
SELECT 
  REPLACE(user_id, 'user_', ''),  -- 새로운 ID
  NULL,                           -- 이메일 없음
  'Legacy User',                  -- 기본 이름
  NULL,                           -- 프로필 사진 없음  
  'guest',                        -- 게스트 타입
  user_id,                        -- 원래 device ID 보존
  MIN(created_at),                -- 첫 세션 날짜
  MAX(updated_at),                -- 마지막 업데이트
  MAX(updated_at)                 -- 마지막 로그인
FROM collage_sessions 
WHERE user_id NOT IN (SELECT device_id FROM users WHERE device_id IS NOT NULL)
GROUP BY user_id;

-- 세션 데이터 새 사용자 ID로 업데이트  
UPDATE collage_sessions 
SET user_id_new = (
  SELECT id FROM users WHERE device_id = collage_sessions.user_id
)
WHERE user_id_new IS NULL;
```

### Step 5: 배포 후 검증

#### 즉시 확인사항
```bash
# 1. 서비스 응답 확인
curl https://colorhunt.app

# 2. 인증 API 확인
curl https://colorhunt.app/api/auth/guest -X POST -H "Content-Type: application/json" -d '{"deviceId":"test"}'

# 3. Google OAuth 플로우 브라우저 테스트
```

#### 모니터링 체크포인트
- [ ] 기존 사용자 접속 확인 (게스트 모드로 자동 전환)
- [ ] 새로운 Google 로그인 기능 작동
- [ ] 기존 콜라주 데이터 정상 접근
- [ ] 새로운 세션 생성 정상
- [ ] 에러율 모니터링 (24시간)

## 🔄 롤백 계획

### 문제 발생시 즉시 롤백
```bash
# 1. 이전 버전으로 긴급 롤백
git checkout main-backup
npm run build
pm2 restart color-hunt

# 2. 또는 Cloudflare Pages 롤백
npx wrangler pages deployment list
npx wrangler pages deployment rollback [DEPLOYMENT_ID]
```

### 데이터 롤백
```sql
-- 인증 관련 테이블만 롤백 (기존 데이터 보존)
DROP TABLE IF EXISTS auth_tokens;
DROP TABLE IF EXISTS users;
-- 기존 collage_sessions, photos 테이블은 그대로 유지
```

## 📊 성공 지표

### 기술적 지표
- [ ] 서비스 가용성 99.9% 이상 유지
- [ ] API 응답시간 기존과 동일 수준  
- [ ] 에러율 1% 이하
- [ ] Google OAuth 로그인 성공률 95% 이상

### 사용자 지표  
- [ ] 기존 사용자 이탈률 5% 이하
- [ ] 새로운 Google 계정 가입률 측정
- [ ] 게스트 모드 사용률 측정
- [ ] 사용자 피드백 모니터링

## 🔧 트러블슈팅

### 일반적인 문제와 해결책

**1. Google OAuth 로그인 실패**
```javascript
// 해결: Redirect URI 확인
console.log('Current domain:', window.location.origin);
// Google Console에서 정확한 URI 설정 확인
```

**2. 기존 사용자 세션 손실**  
```sql
-- 해결: device_id 기반 사용자 찾기
SELECT * FROM users WHERE device_id = 'user_xxxxx';
```

**3. JWT 토큰 검증 실패**
```bash
# 해결: 시크릿 키 확인
npx wrangler secret list
```

## 📞 비상 연락처

**마이그레이션 중 문제 발생시**:
1. 즉시 롤백 실행
2. 사용자 공지사항 업데이트  
3. 로그 분석 및 원인 파악
4. 수정 후 재배포 계획

## 📝 마이그레이션 완료 후 작업

### 정리 작업
- [ ] 스테이징 환경 종료 (또는 다음 개발용으로 유지)
- [ ] 테스트 데이터 정리
- [ ] 문서 업데이트
- [ ] 팀 공유 및 피드백 수집

### 향후 개선사항
- [ ] 사용자 피드백 기반 UX 개선
- [ ] 성능 최적화
- [ ] 추가 소셜 로그인 옵션 고려
- [ ] 고급 사용자 관리 기능 개발

---

**✅ 이 가이드를 따라하면 기존 사용자에게 영향 없이 안전하게 Google OAuth 시스템을 프로덕션에 적용할 수 있습니다.**