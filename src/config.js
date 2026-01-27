const config = {
    API_URL: import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:5001/api')
};

export default config;
