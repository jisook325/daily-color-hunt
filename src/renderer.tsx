import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>🎨 Color Hunt - 오늘의 컬러 찾기</title>
        
        {/* PWA 메타데이터 */}
        <meta name="theme-color" content="#FFD700" />
        <meta name="description" content="오늘의 컬러를 찾아 9장의 사진으로 콜라주를 만들어보세요!" />
        
        {/* 아이콘 및 매니페스트 */}
        <link rel="manifest" href="/static/manifest.json" />
        <link rel="icon" href="/static/favicon.ico" />
        <link rel="apple-touch-icon" href="/static/icon-192x192.png" />
        
        {/* CSS 라이브러리 */}
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        
        {/* 커스텀 CSS */}
        <link href="/static/styles.css" rel="stylesheet" />
        
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
