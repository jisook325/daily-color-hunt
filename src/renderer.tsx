import { jsxRenderer } from 'hono/jsx-renderer'

// SEO 메타데이터 다국어 설정
const seoData = {
  en: {
    title: '🎨 Color Hunt - Daily Color Discovery Game',
    description: 'Find today\'s color in real life and create a beautiful 9-photo collage! Play with friends, capture memories, and discover colors around you. Auto-save your collages to your mobile album.',
    keywords: 'color hunt, photo collage, daily challenge, color discovery, photography game, mobile app, friends game, memory creation, color matching, photo album',
    ogTitle: '🎨 Color Hunt - Daily Color Discovery Game',
    ogDescription: 'Discover today\'s color in real life! Create stunning 9-photo collages with auto-save feature. Perfect for friends, couples, and memory-making.',
    twitterTitle: '🎨 Color Hunt - Daily Color Discovery Game',
    twitterDescription: 'Find colors, take photos, create collages! Auto-save your memories in this fun daily color challenge.'
  },
  ko: {
    title: '🎨 컬러 헌트 - 일일 색깔 발견 게임',
    description: '오늘의 색깔을 현실에서 찾아 아름다운 9장 사진 콜라주를 만들어보세요! 친구들과 함께 추억을 만들고, 주변 색깔들을 발견해보세요. 콜라주를 모바일 앨범에 자동 저장됩니다.',
    keywords: '컬러헌트, 사진 콜라주, 일일 챌린지, 색깔 발견, 사진 게임, 모바일 앱, 친구 게임, 추억 만들기, 색깔 매칭, 사진 앨범',
    ogTitle: '🎨 컬러 헌트 - 일일 색깔 발견 게임',
    ogDescription: '현실에서 오늘의 색깔을 발견해보세요! 자동 저장 기능으로 멋진 9장 콜라주를 만들어보세요. 친구, 연인과 추억 만들기에 완벽합니다.',
    twitterTitle: '🎨 컬러 헌트 - 일일 색깔 발견 게임',
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
        <meta property="og:image:alt" content="Color Hunt - Daily Color Discovery Game" />
        <meta property="og:locale" content={lang === 'ko' ? 'ko_KR' : 'en_US'} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@ColorHuntApp" />
        <meta name="twitter:creator" content="@ColorHuntApp" />
        <meta name="twitter:title" content={seo.twitterTitle} />
        <meta name="twitter:description" content={seo.twitterDescription} />
        <meta name="twitter:image" content="https://colorhunt.app/static/twitter-card-1200x600.png" />
        <meta name="twitter:image:alt" content="Color Hunt - Daily Color Discovery Game" />
        
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
        
        {/* Tailwind 커스텀 설정 */}
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    'color-red': '#FF3333',
                    'color-orange': '#FFCC99', 
                    'color-yellow': '#FFF2CC',
                    'color-green': '#C6E2C7',
                    'color-blue': '#B3D3FF',
                    'color-lavender': '#C7B3EB',
                    'color-purple': '#E0B3FF',
                    'color-white': '#FEFEFE',
                    'color-black': '#2D2D2D',
                    'color-pink': '#ffbde4',
                    'color-tan': '#D2B48C',
                    'color-beige': '#A67B5B'
                  }
                }
              }
            }
          `
        }}></script>
      </head>
      <body class="bg-gray-50 min-h-screen p-2 text-center" style="transition: background-color 0.5s ease;">
        {children}
        
        {/* JavaScript 라이브러리 */}
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        
        {/* 메인 앱 스크립트 */}
        <script src="/static/app.js"></script>
      </body>
    </html>
  )
})
