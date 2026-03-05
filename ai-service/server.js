require('dotenv').config();
const app = require('./src/app');

const PORT = parseInt(process.env.PORT || '5002', 10);

app.listen(PORT, () => {
  console.log('\n🤖  ai-service running on port ' + PORT);
  console.log('    Model : ' + (process.env.OPENAI_MODEL   || 'llama-3.3-70b-versatile'));
  console.log('    Base  : ' + (process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1') + '\n');
});

process.on('unhandledRejection', (reason) => { console.error('[UnhandledRejection]', reason); });
process.on('uncaughtException',  (err)    => { console.error('[UncaughtException]',  err);    process.exit(1); });