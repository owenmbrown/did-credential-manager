import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5171,
        host: true,
        proxy: {
            '/invitations': 'http://localhost:5001',
            '/credentials': 'http://localhost:5001',
        }
    },
});
