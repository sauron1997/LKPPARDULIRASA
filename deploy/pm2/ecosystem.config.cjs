module.exports = {
  apps: [
    {
      name: 'lkp-parduli-rasa-api',
      cwd: '/var/www/lkp-parduli-rasa/current',
      script: 'apps/api/src/index.js',
      instances: 1,
      autorestart: true,
      max_restarts: 5,
      time: true,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3001',
      },
    },
  ],
};
