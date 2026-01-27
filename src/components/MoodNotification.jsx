import React, { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import config from '../config';

const MoodNotification = () => {
    // Queue to hold incoming notifications
    const queueRef = useRef([]);
    // Track if we are currently in a "cooldown" period or displaying a notification
    const processingRef = useRef(false);
    // Track if user is hovering (to pause queue)
    const isPausedRef = useRef(false);

    useEffect(() => {
        // Extract base URL from config.API_URL (e.g., http://localhost:5001/api -> http://localhost:5001)
        const socketUrl = config.API_URL.replace('/api', '');
        const socket = io(socketUrl);

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });

        socket.on('mood_update', (data) => {
            // Add to queue
            queueRef.current.push(data);
            // Try to process immediately if not already processing
            processQueue();
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const processQueue = () => {
        if (processingRef.current) {
            return; // Already waiting or displaying
        }

        if (queueRef.current.length === 0) {
            return; // Nothing to show
        }

        // Lock processing
        processingRef.current = true;

        // Get next item
        const data = queueRef.current.shift();

        // Display custom toast
        toast.custom((t) => (
            <div
                className={`${t.visible ? 'animate-enter' : 'animate-leave'
                    } w-72 bg-slate-800/90 border border-white/10 shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer backdrop-blur-md hover:bg-slate-800 transition-all duration-300 transform hover:scale-[1.02]`}
                onClick={() => {
                    // Dispatch event to open panel and scroll to item
                    window.dispatchEvent(new CustomEvent('OPEN_MOOD_REASON', {
                        detail: {
                            id: data._id,
                            mood: data.mood,
                            districtId: data.districtId
                        }
                    }));
                    toast.dismiss(t.id);
                    isPausedRef.current = false; // Ensure unpaused on click dismissal
                }}
                onMouseEnter={() => {
                    isPausedRef.current = true;
                }}
                onMouseLeave={() => {
                    isPausedRef.current = false;
                }}
            >
                <div className="flex-1 w-0 p-3">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                            <span className="text-xl">
                                {data.mood === 'Happy' ? '😊' :
                                    data.mood === 'Sad' ? '😢' :
                                        data.mood === 'Excited' ? '🤩' :
                                            data.mood === 'Angry' ? '😡' : '😐'}
                            </span>
                        </div>
                        <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start mb-0.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {data.districtId}
                                </p>
                                <p className="text-[9px] text-slate-500">Just now</p>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-200 leading-relaxed break-words">
                                {data.reason ? `"${data.reason}"` : "New mood reported!"}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-1.5">Click to view in feed</p>
                        </div>
                    </div>
                </div>
            </div>
        ), {
            duration: 5000,
            position: 'bottom-left',
        });

        // Wait 20 seconds before allowing the next one
        const tryNext = () => {
            if (isPausedRef.current) {
                // If paused, wait another 1s and check again
                setTimeout(tryNext, 1000);
            } else {
                processingRef.current = false;
                processQueue();
            }
        };

        setTimeout(tryNext, 20000);
    };

    return null;
};

export default MoodNotification;
