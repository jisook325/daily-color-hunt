import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children, ...props }) => {
  const gaId = props?.gaId || 'GA_MEASUREMENT_ID';
  return (
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>🎨 Color Hunt - 오늘의 컬러 찾기</title>
        
        {/* PWA 메타데이터 */}
        <meta name="theme-color" content="#E53E3E" />
        <meta name="description" content="오늘의 컬러를 찾아 9장의 사진으로 콜라주를 만들어보세요! 친구, 연인과 함께 즐기는 컬러 헌트 게임." />
        <meta name="keywords" content="컬러헌트, 콜라주, 사진, 게임, 커플, 친구, 일상, 추억, 색깔찾기" />
        <meta name="author" content="Color Hunt Team" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="💖 Color Hunt - 컬러 콜라주" />
        <meta property="og:description" content="오늘의 컬러를 찾아 9장의 사진으로 콜라주를 만들어보세요!" />
        <meta property="og:site_name" content="Color Hunt" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="💖 Color Hunt - 컬러 콜라주" />
        <meta name="twitter:description" content="오늘의 컬러를 찾아 9장의 사진으로 콜라주를 만들어보세요!" />
        
        {/* 아이콘 및 매니페스트 */}
        <link rel="manifest" href="/static/manifest.json" />
        <link rel="icon" type="image/png" sizes="32x32" href="/static/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/static/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/static/favicon-48x48.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/static/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/static/icon-512x512.png" />
        
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
                  page_title: '💖 Color Hunt - 컬러 콜라주',
                  send_page_view: true,
                  custom_map: {
                    'custom_parameter_1': 'color_name',
                    'custom_parameter_2': 'session_id'
                  }
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
                    'color-red': '#FF0000',
                    'color-orange': '#FF8C00', 
                    'color-yellow': '#FFD700',
                    'color-green': '#00FF00',
                    'color-blue': '#0066FF',
                    'color-indigo': '#4B0082',
                    'color-purple': '#8A2BE2',
                    'color-white': '#FFFFFF',
                    'color-black': '#000000'
                  }
                }
              }
            }
          `
        }}></script>
      </head>
      <body class="bg-gray-50 min-h-screen">
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
