import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({base:'/english/',plugins:[react()],server:{allowedHosts:['terminal.local']},build:{outDir:'dist'}});
