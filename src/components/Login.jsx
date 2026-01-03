import React from 'react'
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-slate-700">
                <h2 className="text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
                    Welcome Back
                </h2>
                <p className="text-slate-400 text-center mb-8">Login to submit your mood</p>

                <div className="mb-6 flex justify-center">
                    <GoogleLogin
                        onSuccess={async (credentialResponse) => {
                            const success = await login(credentialResponse);
                            if (success) {
                                navigate('/map');
                            } else {
                                alert("Login failed with backend");
                            }
                        }}
                        onError={() => {
                            console.log('Login Failed');
                        }}
                        theme="filled_black"
                        shape="pill"
                        size="large"
                        width="300"
                    />
                </div>

                <p className="text-slate-400 text-center text-sm">
                    Access is restricted to valid Google accounts only.
                </p>

            </div>
        </div>
    );
};

export default Login;
