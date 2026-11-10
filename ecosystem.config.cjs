const applicationName = process.env.PM2_APP_NAME || "finances-api";

const baseProcess = {
  cwd: __dirname,
  interpreter: "node",
  exec_mode: "fork",
  instances: 1,
  autorestart: true,
  watch: false,
  source_map_support: true,
  restart_delay: 5_000,
  exp_backoff_restart_delay: 1_000,
  kill_timeout: 10_000,
  max_restarts: 5,
  min_uptime: "15s",
  merge_logs: true,
  env: {
    NODE_ENV: "development",
    LOG_LEVEL: "info",
  },
  env_production: {
    NODE_ENV: "production",
    LOG_LEVEL: "info",
  },
};

module.exports = {
  apps: [
    {
      ...baseProcess,
      name: applicationName,
      script: "dist/server.js",
      node_args: "--enable-source-maps --max-old-space-size=192",
      max_memory_restart: "256M",
    },
    {
      ...baseProcess,
      name: `${applicationName}-worker`,
      script: "dist/worker/main.js",
      node_args: "--enable-source-maps --max-old-space-size=160",
      max_memory_restart: "224M",
    },
  ],
};
