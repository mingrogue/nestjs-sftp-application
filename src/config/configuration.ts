export default () => ({
  sftp: {
    host: process.env.SFTP_HOST || 'localhost',
    port: parseInt(process.env.SFTP_PORT || '22', 10),
    username: process.env.SFTP_USERNAME || 'user',
    password: process.env.SFTP_PASSWORD,
    privateKeyPath: process.env.SFTP_PRIVATE_KEY_PATH,
    remotePath: process.env.SFTP_REMOTE_PATH || '/upload',
    pollIntervalMs: parseInt(process.env.SFTP_POLL_INTERVAL_MS || '5000', 10),
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'sftp-source',
    topic: process.env.KAFKA_TOPIC || 'sftp-documents',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  port: parseInt(process.env.PORT || '3000', 10),
});
