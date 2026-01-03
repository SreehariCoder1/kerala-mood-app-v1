import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

import config from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session (e.g., from localStorage) on load
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
        setLoading(false);
    }, []);

    const login = async (credentialResponse) => {
        try {
            // Send JWT to OUR backend
            const res = await axios.post(`${config.API_URL}/auth/google`, {
                credential: credentialResponse.credential,
                client_id: credentialResponse.clientId
            });

            const { user, token } = res.data;

            setUser(user);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('token', token);

            // Set default header for future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            return true;
        } catch (error) {
            console.error("Login failed:", error.response ? error.response.data : error.message);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
