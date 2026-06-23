module.exports = {
  apps: [
    {
      name: 'appvault',
      script: 'server/index.js',
      cwd: '/var/www/appvault',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      max_memory_restart: '512M',
      time: true,
      merge_logs: true,
    },
  ],
};
