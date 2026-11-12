import dotenv from 'dotenv';
import { createApp } from './app';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🧬 SynthiaBio Backend Engine — Phase 1: Backend-First Mode`);
  console.log(`🚀 Server listening on: http://localhost:${PORT}`);
  console.log(`🩺 Health check at:     http://localhost:${PORT}/health`);
  console.log(`================================================================`);
});
