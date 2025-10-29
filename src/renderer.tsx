import { jsxRenderer } from 'hono/jsx-renderer'

// SEO 메타데이터 다국어 설정
const seoData = {
  en: {
    title: 'Color Hunt - Daily Color Discovery',
    description: 'Find today\'s color in real life and create a beautiful photo collage! Play with friends, capture memories, and discover colors around you. Auto-save your collages to your mobile album.',
    keywords: 'color hunt, photo collage, daily challenge, color discovery, photography game, mobile app, friends game, memory creation, color matching, photo album',
    ogTitle: 'Color Hunt - Daily Color Discovery',
    ogDescription: 'Discover today\'s color in real life! Create stunning photo collages with auto-save feature. Perfect for friends, couples, and memory-making.',
    twitterTitle: 'Color Hunt - Daily Color Discovery',
    twitterDescription: 'Find colors, take photos, create collages! Auto-save your memories in this fun daily color challenge.'
  },
  ko: {
    title: 'Color Hunt - 매일 새로운 색을 모아보세요',
    description: '오늘의 색깔을 찾아 귀여운 사진을 완성해보세요!  친구들과 함께 추억을 만들고, 주변 색깔들을 발견해보세요.',
    keywords: 'colorhunt, date, 컬러헌트, 일일 챌린지, 색깔 찾기, 사진 게임, 모바일 앱, 친구 게임, 추억 만들기, 여행, 사진 앨범',
    ogTitle: 'Color Hunt - 매일 새로운 색을 모아보세요',
    ogDescription: '현실에서 오늘의 색깔을 발견해보세요!  친구, 연인과 추억 만들기에 완벽합니다.',
    twitterTitle: 'Color Hunt - 매일 새로운 색을 모아보세요',
    twitterDescription: '색깔을 찾고, 사진을 찍고, 콜라주를 만드세요! 재미있는 일일 색깔 챌린지로 추억을 자동 저장하세요.'
  }
};

export const renderer = jsxRenderer(({ children, ...props }) => {
  const gaId = props?.gaId || 'GA_MEASUREMENT_ID';
  const lang = props?.lang || 'ko'; // 기본값 한국어
  const seo = seoData[lang as keyof typeof seoData] || seoData.ko;
  
  return (
    <html lang={lang}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{seo.title}</title>
        
        {/* SEO 메타데이터 */}
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords} />
        <meta name="author" content="Color Hunt Team" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        
        {/* 다국어 지원 */}
        <link rel="alternate" hreflang="ko" href="https://colorhunt.app/?lang=ko" />
        <link rel="alternate" hreflang="en" href="https://colorhunt.app/?lang=en" />
        <link rel="alternate" hreflang="x-default" href="https://colorhunt.app/" />
        
        {/* PWA 메타데이터 */}
        <meta name="theme-color" content="#E9EEFA" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="application-name" content="Color Hunt" />
        <meta name="apple-mobile-web-app-title" content="Color Hunt" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://colorhunt.app/" />
        <meta property="og:title" content={seo.ogTitle} />
        <meta property="og:description" content={seo.ogDescription} />
        <meta property="og:site_name" content="Color Hunt" />
        <meta property="og:image" content="https://colorhunt.app/static/og-image-1200x630.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={seo.title} />
        <meta property="og:locale" content={lang === 'ko' ? 'ko_KR' : 'en_US'} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@ColorHuntApp" />
        <meta name="twitter:creator" content="@ColorHuntApp" />
        <meta name="twitter:title" content={seo.twitterTitle} />
        <meta name="twitter:description" content={seo.twitterDescription} />
        <meta name="twitter:image" content="https://colorhunt.app/static/twitter-card-1200x600.png" />
        <meta name="twitter:image:alt" content={seo.title} />
        
        {/* 구조화된 데이터 (Schema.org) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": seo.title,
            "description": seo.description,
            "url": "https://colorhunt.app",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "author": {
              "@type": "Organization",
              "name": "Color Hunt Team"
            },
            "inLanguage": ["ko", "en"],
            "screenshot": "https://colorhunt.app/static/app-screenshot.png"
          })
        }} />
        
        {/* 아이콘 및 매니페스트 */}
        <link rel="manifest" href="/static/manifest.json" />
        <link rel="icon" type="image/png" sizes="32x32" href="/static/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/static/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/static/favicon-48x48.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/static/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/static/icon-512x512.png" />
        <link rel="shortcut icon" href="/static/favicon.ico" />
        
        {/* Google Fonts - Alan Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Alan+Sans:wght@200;300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        
        {/* CSS 라이브러리 */}
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        
        {/* 커스텀 CSS */}
        <link href="/static/styles.css" rel="stylesheet" />
        

        
        {/* Google Analytics */}
        {gaId && gaId !== 'GA_MEASUREMENT_ID' && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}></script>
            <script dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                
                gtag('config', '${gaId}', {
                  page_title: '${seo.title}',
                  send_page_view: true,
                  custom_map: {
                    'custom_parameter_1': 'color_name',
                    'custom_parameter_2': 'session_id',
                    'custom_parameter_3': 'language'
                  },
                  language: '${lang}'
                });
              `
            }}></script>
          </>
        )}
        
        {/* Tailwind 커스텀 설정 - Alan Sans 폰트 적용 */}
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              theme: {
                extend: {
                  fontFamily: {
                    'sans': ['Alan Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
                    'alan': ['Alan Sans', 'sans-serif']
                  },
                  colors: {
                    'color-red': '#D72638',
                    'color-orange': '#FF8C42', 
                    'color-yellow': '#F4B400',
                    'color-green': '#2E8B57',
                    'color-blue': '#007ACC',
                    'color-purple': '#6C2DC7',
                    'color-white': '#FEFEFE',
                    'color-black': '#2D2D2D',
                    'color-pink': '#E75480',
                    'color-tan': '#A67C52',
                    'color-beige': '#8B5E3C',
                    'color-matcha': '#82A860'
                  }
                }
              }
            }
          `
        }}></script>
      </head>
      <body class="font-alan bg-gray-50 min-h-screen p-2 text-center" style="font-family: 'Alan Sans', sans-serif; transition: background-color 0.5s ease;">
        {children}
        
        {/* JavaScript 라이브러리 */}
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        
        {/* Safari 세션 보호를 위한 IndexedDB 유틸리티 */}
        <script src="/static/sessionDB.js"></script>
        
        {/* 메인 앱 스크립트 */}
        <script src="/static/app.js"></script>
      </body>
    </html>
  )
})
