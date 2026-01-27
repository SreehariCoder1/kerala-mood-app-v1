import { useState, useRef, useEffect, useMemo } from "react";
import io from 'socket.io-client';
import styles from '../../styles/GlobalChat.module.css';
import { useAuth } from '../../context/AuthContext';
import config from '../../config';
import { playMessageSentSound, playMessageReceivedSound } from '../../utils/audio';

// Mood Constants & Emoji Map
const moods = ["All", "Happy", "Sad", "Angry", "Excited", "Neutral"];
const moodEmojis = {
    "All": "🌍",
    "Happy": "😊",
    "Sad": "😢",
    "Angry": "😠",
    "Excited": "🤩",
    "Neutral": "😐"
};


const renderTextWithLinks = (text) => {
    // Regex for URLs only
    const regex = /((?:https?:\/\/[^\s]+))/g;

    const parts = text.split(regex);

    return parts.map((part, i) => {
        if (part.match(/^https?:\/\//)) {
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline break-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};

// Flattened Message Component
// Component for individual Reply (to have own state)
const ReplyItem = ({ reply, user, onReply, onHide, onHighlight, isHidden, onVote }) => {
    const likes = reply.likedBy ? reply.likedBy.length : 0;
    const dislikes = reply.dislikedBy ? reply.dislikedBy.length : 0;
    const userVote = reply.likedBy?.includes(user?.name) ? 'like' : (reply.dislikedBy?.includes(user?.name) ? 'dislike' : null);

    const handleVoteClick = (type) => {
        if (!user) return; // or prompt login
        onVote(reply.id, type);
    };

    if (isHidden) {
        return (
            <div id={`msg-${reply.id}`} className="mt-2 ml-1 text-xs text-gray-500 italic flex items-center gap-2 animate-fadeIn bg-gray-800/50 p-1 rounded border border-gray-700/30">
                <span>Message hidden</span>
                <button onClick={() => onHide(reply.id)} className="text-blue-400 hover:text-blue-300 hover:underline px-1">Undo</button>
            </div>
        );
    }

    return (
        <div id={`msg-${reply.id}`} className="flex flex-col animate-fadeIn mt-2 group first:mt-1">
            {/* Reply Header */}
            <div className="flex justify-between items-baseline mb-0.5">
                <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold ${reply.sender === user?.name ? 'text-blue-400' : 'text-orange-400'}`}>
                        {reply.sender}
                    </span>
                    <span className="text-[9px] text-gray-500">
                        {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className="flex gap-2">
                    {/* Like */}
                    <button onClick={() => handleVoteClick('like')} className={`text-[10px] flex items-center gap-1 ${userVote === 'like' ? 'text-green-400' : 'text-gray-400 hover:text-green-400'}`}>
                        👍 {likes > 0 && likes}
                    </button>
                    {/* Dislike */}
                    <button onClick={() => handleVoteClick('dislike')} className={`text-[10px] flex items-center gap-1 ${userVote === 'dislike' ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}>
                        👎 {dislikes > 0 && dislikes}
                    </button>
                    <button onClick={() => onReply(reply)} className="text-[10px] text-gray-400 hover:text-white">↩</button>
                    <button onClick={() => onHide(reply.id)} className="text-[10px] text-gray-400 hover:text-red-500">👁️‍🗨️</button>
                </div>
            </div>

            <div className="bg-gray-800/80 p-1.5 rounded-lg rounded-tl-none text-xs text-gray-200 break-words border border-gray-700/30 hover:bg-gray-800 transition-colors">
                {/* Mention indication(s) */}
                {Array.isArray(reply.replyTo) && reply.replyTo.length > 0 && (
                    <span className="mr-1">
                        {reply.replyTo.map((r, idx) => (
                            <span
                                key={idx}
                                className="text-blue-400 font-bold cursor-pointer hover:underline mr-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onHighlight) onHighlight(r.id);
                                }}
                            >
                                @{r.sender}
                            </span>
                        ))}
                    </span>
                )}

                <span className="whitespace-pre-wrap">
                    {renderTextWithLinks(reply.text)}
                </span>
            </div>
        </div>
    );
};

const MessageNode = ({ message, replies = [], user, activeTab, onReply, onHide, onHighlight, hiddenMessageIds, onVote }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    const likes = message.likedBy ? message.likedBy.length : 0;
    const dislikes = message.dislikedBy ? message.dislikedBy.length : 0;
    const userVote = message.likedBy?.includes(user?.name) ? 'like' : (message.dislikedBy?.includes(user?.name) ? 'dislike' : null);

    // Normalize replyTo to Array
    const replyToList = Array.isArray(message.replyTo) ? message.replyTo : (message.replyTo ? [message.replyTo] : []);

    // Check hidden status
    const isHidden = hiddenMessageIds && hiddenMessageIds.has(message.id);

    const handleVoteClick = (type) => {
        if (!user) return;
        onVote(message.id, type);
    };

    const isRoot = replyToList.length === 0;

    if (isHidden) {
        return (
            <div id={`msg-${message.id}`} className="mt-4 mb-2 bg-gray-800/50 border border-gray-700/30 p-2 rounded flex items-center justify-between text-xs text-gray-500 italic animate-fadeIn">
                <span>Message from {message.sender} hidden</span>
                <button
                    onClick={() => onHide(message.id)}
                    className="text-blue-400 hover:text-blue-300 hover:underline px-2 py-1"
                >
                    Undo
                </button>
            </div>
        );
    }

    return (
        <div
            id={`msg-${message.id}`}
            className={`flex flex-col mt-4 transition-colors duration-500`}
        >
            {/* Main Message Card */}
            <div className="flex flex-col animate-fadeIn group relative">
                <div className="flex justify-between items-baseline mb-1 pl-1">
                    <div className="flex items-center gap-2">
                        {/* Collapse Toggle */}
                        {isRoot && replies.length > 0 && (
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="text-xs text-gray-500 hover:text-white focus:outline-none w-4 h-4 flex items-center justify-center border border-gray-600 rounded bg-gray-800"
                                title={isCollapsed ? "Expand" : "Collapse"}
                            >
                                {isCollapsed ? "+" : "-"}
                            </button>
                        )}
                        <span className={`text-xs font-bold ${message.sender === user?.name ? 'text-blue-400' : 'text-orange-400'}`}>
                            {message.sender}
                        </span>
                        <span className="text-[10px] text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button onClick={() => handleVoteClick('like')} className={`text-[10px] flex items-center gap-1 ${userVote === 'like' ? 'text-green-400' : 'text-gray-400 hover:text-green-400'}`}>
                            👍 {likes > 0 && likes}
                        </button>
                        <button onClick={() => handleVoteClick('dislike')} className={`text-[10px] flex items-center gap-1 ${userVote === 'dislike' ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}>
                            👎 {dislikes > 0 && dislikes}
                        </button>
                        <button onClick={() => onReply(message)} className="text-[10px] text-gray-400 hover:text-white" title="Reply">
                            ↩
                        </button>
                        <button onClick={() => onHide(message.id)} className="text-[10px] text-gray-400 hover:text-red-500" title="Hide">
                            👁️‍🗨️
                        </button>
                    </div>
                </div>

                <div className="bg-gray-800 p-2 rounded-lg rounded-tl-none text-sm text-gray-200 break-words shadow-sm border border-gray-700/50">
                    {activeTab === "All" && (
                        <span className="text-lg mr-1 align-middle" title={message.mood}>
                            {moodEmojis[message.mood] || message.mood}
                        </span>
                    )}
                    <span className="align-middle whitespace-pre-wrap">
                        {renderTextWithLinks(message.text)}
                    </span>
                </div>
            </div>

            {/* Collapsed Indicator */}
            {isRoot && isCollapsed && replies.length > 0 && (
                <div
                    className="text-[10px] text-gray-500 ml-4 mt-1 cursor-pointer hover:text-gray-300 italic"
                    onClick={() => setIsCollapsed(false)}
                >
                    {replies.length} replies hidden...
                </div>
            )}

            {/* Replies Section */}
            {!isCollapsed && replies.length > 0 && (
                <div className={`mt-2 pl-2 space-y-2 relative ${styles.replyLine}`}>
                    {replies.map(reply => (
                        <ReplyItem
                            key={reply.id}
                            reply={reply}
                            user={user}
                            onReply={onReply}
                            onHide={onHide}
                            onHighlight={onHighlight}
                            isHidden={hiddenMessageIds && hiddenMessageIds.has(reply.id)}
                            onVote={onVote}
                        />
                    ))}
                    {/* Bottom Collapse Button */}
                    <div className="flex justify-end pt-1">
                        <button
                            onClick={() => setIsCollapsed(true)}
                            className="text-xs text-gray-500 hover:text-white focus:outline-none w-4 h-4 flex items-center justify-center border border-gray-600 rounded bg-gray-800"
                            title="Collapse Thread"
                        >
                            -
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const GlobalChat = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [activeTab, setActiveTab] = useState("All");
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [onlineCount, setOnlineCount] = useState(0);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [dailyMessageCount, setDailyMessageCount] = useState(0);
    const soundEnabledRef = useRef(true);
    
    // Keep ref in sync
    useEffect(() => {
        soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    const typingTimeoutRef = useRef(null);

    // Reply State: Array of { id, text, sender }
    const [replyingTo, setReplyingTo] = useState([]);

    // Hidden Messages State
    const [hiddenMessageIds, setHiddenMessageIds] = useState(new Set());

    const [selectedMood, setSelectedMood] = useState("Neutral");

    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const textareaRef = useRef(null);

    // Handle Join/Leave events based on isOpen
    useEffect(() => {
        if (!socketRef.current) return;
        
        if (isOpen) {
            if (socketRef.current.connected) {
                socketRef.current.emit('chat:join', { username: user?.name || 'Anonymous' });
            }
        } else {
            if (socketRef.current.connected) {
                socketRef.current.emit('chat:leave');
            }
        }
    }, [isOpen]);

    // ... (Socket connection useEffect)
    useEffect(() => {
        // Connect to socket using centralized config
        let SOCKET_URL = config.API_URL;
        if (SOCKET_URL.endsWith('/api')) {
            SOCKET_URL = SOCKET_URL.replace('/api', '');
        }

        socketRef.current = io(SOCKET_URL);

        socketRef.current.on('connect', () => {
            // If chat is already open (e.g. after reconnect), re-join
            setIsOpen(prev => {
                if (prev) socketRef.current.emit('chat:join', { username: user?.name || 'Anonymous' });
                return prev;
            });
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('GlobalChat: Connection error:', err);
        });

        socketRef.current.on('chat:broadcast', (message) => {
            setMessages(prev => {
                if (prev.some(m => m.id === message.id)) return prev;

                // Play Sound
                if (soundEnabledRef.current) {
                    if (message.sender === (user?.name || "Anonymous")) {
                        playMessageSentSound();
                    } else {
                        playMessageReceivedSound();
                    }
                }
                
                return [...prev, message];
            });
        });

        socketRef.current.on('chat:history', (history) => {
            setMessages(prev => {
                const newMessages = history.filter(msg => !prev.some(p => p.id === msg.id));
                return [...prev, ...newMessages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            });
        });

        socketRef.current.on('chat:voteUpdate', (updatedMsg) => {
            setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        });

        socketRef.current.on('chat:onlineCount', (count) => {
            setOnlineCount(count);
        });
        
        socketRef.current.on('chat:messageCount', (count) => {
           setDailyMessageCount(count); 
        });

        socketRef.current.on('chat:typing', ({ username }) => {
            setTypingUsers(prev => {
                const newSet = new Set(prev);
                newSet.add(username);
                return newSet;
            });
        });

        socketRef.current.on('chat:stopTyping', ({ username }) => {
            setTypingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(username);
                return newSet;
            });
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Scroll handling
    useEffect(() => { if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); }, [isOpen, activeTab]);
    useEffect(() => { if (isOpen && messages.length > 0) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => { if (activeTab !== "All") setSelectedMood(activeTab); }, [activeTab]);
    useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`; } }, [inputValue]);


    // Group messages into Roots and Replies
    const groupedMessages = useMemo(() => {
        const visible = messages.filter(msg => {
            if (activeTab !== "All" && msg.mood !== activeTab) return false;
            // Removed hiddenMessageIds filter to allow rendering placeholders
            return true;
        });

        const msgMap = new Map();
        visible.forEach(msg => msgMap.set(msg.id, msg));

        const roots = [];
        const replies = new Map();

        visible.forEach(msg => {
            // Check if replyTo exists and is not empty array
            const isReply = Array.isArray(msg.replyTo) ? msg.replyTo.length > 0 : !!msg.replyTo;

            if (!isReply) {
                // Root
                roots.push(msg);
                if (!replies.has(msg.id)) replies.set(msg.id, []);
            } else {
                // Reply
                // Use first reply target as the anchor for the tree
                const replyTargets = Array.isArray(msg.replyTo) ? msg.replyTo : [msg.replyTo];
                const primaryTargetId = replyTargets[0].id;

                let pointer = msg;
                let rootId = null;
                let depth = 0;

                // Trace back from Primary Target
                // Start trace from the message we replied to
                let currentTraceId = primaryTargetId;

                while (depth < 20) {
                    const parent = msgMap.get(currentTraceId);
                    if (!parent) break; // Parent not visible/found

                    const parentIsReply = Array.isArray(parent.replyTo) ? parent.replyTo.length > 0 : !!parent.replyTo;
                    if (!parentIsReply) {
                        // Parent is a root!
                        rootId = parent.id;
                        break;
                    }

                    // Parent is also a reply, go up
                    const parentTargets = Array.isArray(parent.replyTo) ? parent.replyTo : [parent.replyTo];
                    currentTraceId = parentTargets[0].id;
                    depth++;
                }

                // If found a root
                if (rootId) {
                    if (!replies.has(rootId)) replies.set(rootId, []);
                    replies.get(rootId).push(msg);
                } else {
                    // Fallback: If we couldn't trace to a root (e.g. root deleted or invisible), treat as root
                    roots.push(msg);
                    if (!replies.has(msg.id)) replies.set(msg.id, []);
                }
            }
        });

        roots.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        replies.forEach(list => list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        return { roots, replies };

    }, [messages, activeTab, hiddenMessageIds]);


    const handleSend = (e) => {
        if (e) e.preventDefault();
        if (!inputValue.trim()) return;

        const payload = {
            text: inputValue,
            mood: selectedMood,
            sender: user ? user.name : "Anonymous",
            replyTo: replyingTo.length > 0 ? replyingTo.map(r => ({
                id: r.id,
                sender: r.sender,
                text: r.text
            })) : [] // Send Array
        };

        if (socketRef.current?.connected) {
            socketRef.current.emit('chat:send', payload);
        }

        setInputValue("");
        setReplyingTo([]); // Reset array
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        // Stop typing immediately on send
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (socketRef.current?.connected && user) {
            socketRef.current.emit('chat:stopTyping', { username: user.name });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Warning State
    const [replyWarning, setReplyWarning] = useState(null);

    // Helper to find the root ID of a message's thread
    const findThreadRoot = (msg, allMsgs) => {
        let current = msg;
        let depth = 0;
        const msgMap = new Map(allMsgs.map(m => [m.id, m]));

        while (depth < 20) {
            const replyList = Array.isArray(current.replyTo) ? current.replyTo : (current.replyTo ? [current.replyTo] : []);
            if (replyList.length === 0) {
                return current.id; // Found root
            }

            const parentId = replyList[0].id;
            const parent = msgMap.get(parentId);

            if (!parent) return current.id; // Parent missing, treat current as pseudo-root
            current = parent;
            depth++;
        }
        return current.id;
    };

    const handleReply = (msg) => {
        setReplyWarning(null); // Clear prev warning

        setReplyingTo(prev => {
            const exists = prev.find(p => p.id === msg.id);
            if (exists) {
                // Toggle off
                const newList = prev.filter(p => p.id !== msg.id);
                if (newList.length === 0) setSelectedMood("Neutral"); // Reset mood if empty? Optional.
                return newList;
            } else {
                // Validate Thread Consistency
                if (prev.length > 0) {
                    const currentRoot = findThreadRoot(prev[0], messages);
                    const newRoot = findThreadRoot(msg, messages);

                    if (currentRoot !== newRoot) {
                        setReplyWarning("You can only reply to messages within the same thread.");
                        // Clear warning after 3s
                        setTimeout(() => setReplyWarning(null), 3000);
                        return prev;
                    }
                }

                // Add (Max 3)
                if (prev.length >= 3) {
                    setReplyWarning("Max 3 replies allowed.");
                    setTimeout(() => setReplyWarning(null), 3000);
                    return prev;
                }

                // Auto-set mood if first
                if (prev.length === 0 && msg.mood && moods.includes(msg.mood)) {
                    setSelectedMood(msg.mood);
                }
                return [...prev, msg];
            }
        });
        textareaRef.current?.focus();
    };

    const handleCancelReply = () => {
        setReplyingTo([]);
        setReplyWarning(null);
    };

    // Remove individual reply target
    const handleRemoveReplyTarget = (id) => {
        setReplyingTo(prev => prev.filter(p => p.id !== id));
    };

    const handleHide = (id) => {
        setHiddenMessageIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleVote = (id, type) => {
        if (socketRef.current?.connected && user) {
            socketRef.current.emit('chat:vote', { id, type, username: user.name });
        }
    };

    const handleHighlight = (target) => {
        let idToFind = null;
        if (typeof target === 'string') idToFind = target;
        else if (target && typeof target === 'object') {
            const { username, replyToIds } = target;
            // 1. Check if user is in replyToIds
            if (replyToIds && replyToIds.length > 0) {
                const repliedMsg = messages.find(m => replyToIds.includes(m.id) && m.sender === username);
                if (repliedMsg) idToFind = repliedMsg.id;
            }
            // 2. Latest msg
            if (!idToFind) {
                const lastMsg = [...messages].reverse().find(m => m.sender === username);
                if (lastMsg) idToFind = lastMsg.id;
            }
        }

        if (idToFind) {
            const el = document.getElementById(`msg-${idToFind}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('bg-blue-800', 'ring-2', 'ring-blue-400');
                setTimeout(() => el.classList.remove('bg-blue-800', 'ring-2', 'ring-blue-400'), 2000);
            }
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105"
            >
                💬 Chat
                {dailyMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-gray-900 shadow-sm animate-bounce">
                        {dailyMessageCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <>
            <div className={`fixed z-50 transition-all duration-300 flex flex-col overflow-hidden font-sans ${styles.chatOpen} ${isFullScreen ? "inset-0 w-full h-full rounded-none border-none" : "bottom-6 right-6 w-80 md:w-96 h-[500px] border border-gray-700 rounded-lg shadow-2xl"
                } bg-gray-900`}>
                {/* Header */}
                <div className="bg-gray-800 p-3 flex justify-between items-center border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <h3 className="text-white font-bold">Tea Shop</h3>
                        <div className="h-4 w-px bg-gray-600"></div>
                        <div className="text-[10px] text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                            {onlineCount} Online
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* FullScreen Toggle */}
                        <button
                            onClick={() => setIsFullScreen(!isFullScreen)}
                            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                            title={isFullScreen ? "Minimize" : "Maximize"}
                        >
                            {isFullScreen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 14h6v6M20 10h-6V4" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M20 16v4m0 0h-4" />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors ${soundEnabled ? "text-green-400" : "text-gray-500"}`}
                            title={soundEnabled ? "Mute Sounds" : "Enable Sounds"}
                        >
                            {soundEnabled ? "🔊" : "🔇"}
                        </button>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">✖</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto bg-gray-800 scrollbar-hide">
                    {moods.map(mood => (
                        <button
                            key={mood}
                            onClick={() => setActiveTab(mood)}
                            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === mood
                                ? 'text-white border-b-2 border-blue-500 bg-gray-700'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-750'
                                }`}
                            title={mood}
                        >
                            {moodEmojis[mood]} {mood !== "All" ? "" : activeTab === "All" ? "All" : ""}
                        </button>
                    ))}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-900/95 scrollbar-thin scrollbar-thumb-gray-700">
                    {groupedMessages.roots.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10 text-sm">
                            No messages in {activeTab === "All" ? "All" : moodEmojis[activeTab]}.<br />Be the first to say hi!
                        </div>
                    ) : (
                        groupedMessages.roots.map((root) => (
                            <MessageNode
                                key={root.id}
                                message={root}
                                replies={groupedMessages.replies.get(root.id)}
                                user={user}
                                activeTab={activeTab}
                                onReply={handleReply}
                                onHide={handleHide}
                                onHighlight={handleHighlight}
                                hiddenMessageIds={hiddenMessageIds}
                                onVote={handleVote}
                            />
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Reply Banner */}
                {(replyingTo.length > 0 || replyWarning) && (
                    <div className="bg-gray-800 px-3 py-2 border-t border-gray-700 flex flex-col text-xs text-gray-300 transition-all">
                        {replyWarning && (
                            <div className="bg-red-500/20 text-red-300 p-1 mb-2 rounded text-center border border-red-500/50">
                                ⚠️ {replyWarning}
                            </div>
                        )}
                        {replyingTo.length > 0 && (
                            <>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-gray-400">Replying to:</span>
                                    <button onClick={handleCancelReply} className="text-gray-500 hover:text-white font-bold">Clear All</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {replyingTo.map(r => (
                                        <span key={r.id} className="bg-gray-700 px-2 py-1 rounded flex items-center gap-1">
                                            <span className="text-blue-400 font-bold">@{r.sender}</span>
                                            <button onClick={() => handleRemoveReplyTarget(r.id)} className="text-gray-500 hover:text-white ml-1">×</button>
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Typing Indicator & Reply Banner */}
                <div className="bg-gray-800 border-t border-gray-700 flex flex-col text-xs text-gray-300 transition-all">
                    {typingUsers.size > 0 && (
                        <div className="px-3 py-1 text-[10px] text-gray-400 italic animate-pulse">
                            {typingUsers.size === 1 
                                ? `${Array.from(typingUsers)[0]} is typing...` 
                                : `${typingUsers.size} users typing...`}
                        </div>
                    )}
                    
                    <form onSubmit={handleSend} className="p-3 flex gap-2 items-end w-full">
                        <select
                            value={selectedMood}
                            onChange={(e) => setSelectedMood(e.target.value)}
                            className="bg-gray-700 text-white text-lg rounded px-2 outline-none border border-gray-600 focus:border-blue-500 appearance-none text-center min-w-[50px] cursor-pointer h-10"
                            title={"Mood: " + selectedMood}
                        >
                            {moods.filter(m => m !== "All").map(m => (
                                <option key={m} value={m}>{moodEmojis[m]}</option>
                            ))}
                        </select>

                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                if (socketRef.current?.connected && user) {
                                    socketRef.current.emit('chat:typing', { username: user.name });
                                    
                                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                                    typingTimeoutRef.current = setTimeout(() => {
                                        socketRef.current.emit('chat:stopTyping', { username: user.name });
                                    }, 2000);
                                }
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={replyingTo.length > 0 ? "Reply to selected..." : `Message...`}
                            rows={1}
                            className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm outline-none border border-gray-600 focus:border-blue-500 placeholder-gray-500 resize-none overflow-y-auto max-h-[120px] scrollbar-thin scrollbar-thumb-gray-500"
                            style={{ minHeight: '40px' }}
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition-colors h-10"
                        >
                            ➤
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default GlobalChat;
