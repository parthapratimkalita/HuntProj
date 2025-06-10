import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  
  // Path resolution for imports
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      },
  },
  
  // Development server configuration
  server: {
    port: 5000,
    host: true, // Allow external connections
    
    // Proxy configuration for API requests
    proxy: {
      // Proxy all /api requests to Python backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // Optional: Add custom headers or modify requests
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add custom headers if needed
            // proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
          });
          
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
        }
      },
      
      // Optional: Proxy other endpoints if needed
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      
      // Optional: Proxy file uploads
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  
  // Build configuration
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true, // Generate source maps for debugging
    
    // Optimization
    rollupOptions: {
      output: {
        // Code splitting for better performance
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['wouter'],
          ui: ['lucide-react'],
          query: ['@tanstack/react-query']
        }
      }
    }
  },
  
  // Environment variables configuration
  define: {
    // Make sure environment variables are available
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
  
  // Preview server (for testing production builds)
  preview: {
    port: 4173,
    host: true,
  }
});