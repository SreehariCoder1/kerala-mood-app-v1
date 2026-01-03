const config = {
    // If VITE_API_URL is set (prod), use it. 
    // Otherwise if running locally (dev), use localhost.
    // On Vercel, we can just use '/api' relative path if frontend/backend are same domain
    API_URL: import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:5001/api')
};

export default config;
