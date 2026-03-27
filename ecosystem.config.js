module.exports = {
  apps: [
    {
      name: "ui-library",
      cwd: __dirname,
      script: "npm.cmd",
      args: "run start:lan",
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
