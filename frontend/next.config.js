module.exports = {
  reactStrictMode: true,
  output: 'export',
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'https://your-backend.onrender.com'
  }
}