module.exports = {
  apps: [
    {
      name: "ui-library",
      cwd: __dirname,
      script: process.execPath,
      args: "./node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 9000",
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      windowsHide: true,
      max_memory_restart: "1G",
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
        PORT: "9000",
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
