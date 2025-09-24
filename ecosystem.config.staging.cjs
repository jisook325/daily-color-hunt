module.exports = {
  apps: [
    {
      name: 'color-hunt-staging',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=color-hunt-staging-db --r2=color-hunt-staging-images --local --ip 0.0.0.0 --port 3001',
      env: {
        NODE_ENV: 'staging',
        PORT: 3001,
        STAGING: 'true'
      },
      watch: false, // Disable PM2 file monitoring - wrangler handles hot reload
      instances: 1, // Development mode uses only one instance
      exec_mode: 'fork'
    }
  ]
}