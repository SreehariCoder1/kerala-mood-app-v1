import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Float, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*                              Floating Emoji                                */
/* -------------------------------------------------------------------------- */

const FloatingEmoji = ({ emoji, position, speed, randomFactor, mouseRef }) => {
    const group = useRef();
    const { viewport } = useThree();

    const halfW = viewport.width / 2;
    const halfH = viewport.height / 2;

    useFrame(() => {
        if (!group.current) return;

        // Normalized mouse position (-1 to 1)
        const { x: mx, y: my } = mouseRef.current;

        // Raw target influenced by mouse
        let targetX = position[0] + mx * randomFactor.x * 5;
        let targetY = position[1] + my * randomFactor.y * 5;

        // Adaptive margin (works on all screens)
        const margin = Math.min(1.5, viewport.width * 0.12);

        // Clamp inside visible window
        targetX = THREE.MathUtils.clamp(
            targetX,
            -halfW + margin,
            halfW - margin
        );

        targetY = THREE.MathUtils.clamp(
            targetY,
            -halfH + margin,
            halfH - margin
        );

        // Smooth interpolation
        group.current.position.x = THREE.MathUtils.lerp(
            group.current.position.x,
            targetX,
            0.05
        );

        group.current.position.y = THREE.MathUtils.lerp(
            group.current.position.y,
            targetY,
            0.05
        );
    });

    return (
        <group ref={group} position={position}>
            <Float
                speed={speed}
                rotationIntensity={1}
                floatIntensity={2}
                floatingRange={[-1, 1]}
            >
                <Html
                    transform
                    style={{
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                >
                    <div
                        className="text-6xl md:text-8xl drop-shadow-2xl filter"
                        style={{ transform: 'translate3d(-50%, -50%, 0)' }}
                    >
                        {emoji}
                    </div>
                </Html>
            </Float>
        </group>
    );
};

/* -------------------------------------------------------------------------- */
/*                                   Rocket                                   */
/* -------------------------------------------------------------------------- */

const Rocket = () => {
    const group = useRef();

    const [data, setData] = useState({
        active: false,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        startTime: 0,
        duration: 0,
        delay: Math.random() * 5000,
    });

    useFrame((state) => {
        if (!group.current) return;

        const now = state.clock.elapsedTime * 1000;

        /* ----------------------------- Activation ---------------------------- */

        if (!data.active) {
            if (now > data.startTime + data.delay) {
                // Random start position (off-screen)
                const startX = (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 5);
                const startY = (Math.random() - 0.5) * 20;
                const startZ = -5 - Math.random() * 10;

                // Cross the screen horizontally
                const endX = -startX;
                const endY = (Math.random() - 0.5) * 20;
                const endZ = startZ;

                const duration = 5000 + Math.random() * 5000;

                setData({
                    active: true,
                    startPos: new THREE.Vector3(startX, startY, startZ),
                    endPos: new THREE.Vector3(endX, endY, endZ),
                    startTime: now,
                    duration,
                    delay: 0,
                });

                // Rotate rocket to face direction of travel
                const angle = Math.atan2(endY - startY, endX - startX);
                group.current.rotation.z = angle - Math.PI / 4;
            }

            return;
        }

        /* ------------------------------ Animation ----------------------------- */

        const progress = (now - data.startTime) / data.duration;

        if (progress >= 1) {
            // Reset after flight
            setData((prev) => ({
                ...prev,
                active: false,
                startTime: now,
                delay: 2000 + Math.random() * 8000,
            }));

            // Hide rocket
            group.current.position.set(100, 100, 100);
            return;
        }

        // Interpolate position
        group.current.position.lerpVectors(
            data.startPos,
            data.endPos,
            progress
        );
    });

    return (
        <group ref={group} position={[100, 100, 100]}>
            <Html
                transform
                style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}
            >
                <div
                    className="text-4xl filter drop-shadow-lg opacity-80"
                    style={{ transform: 'translate3d(-50%, -50%, 0)' }}
                >
                    🚀
                </div>
            </Html>
        </group>
    );
};

/* -------------------------------------------------------------------------- */
/*                              Background Scene                              */
/* -------------------------------------------------------------------------- */

const BackgroundScene = () => {
    // Global mouse ref for pointer-events: none layers
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (event) => {
            mouseRef.current = {
                x: (event.clientX / window.innerWidth) * 2 - 1,
                y: -(event.clientY / window.innerHeight) * 2 + 1,
            };
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Static emoji configuration
    const emojis = useMemo(
        () => [
            { char: '😊', pos: [-5, 2, -10], speed: 1.5, random: { x: 1.5, y: -1.2 } },
            { char: '🤩', pos: [5, -2, -15], speed: 1.2, random: { x: -1.0, y: 1.5 } },
            { char: '😐', pos: [-3, -4, -12], speed: 2.0, random: { x: 0.8, y: 0.8 } },
            { char: '😢', pos: [4, 3, -8], speed: 1.8, random: { x: -1.5, y: -0.5 } },
            { char: '😡', pos: [0, 0, -20], speed: 1.0, random: { x: 2.0, y: 2.0 } },
        ],
        []
    );

    return (
        <>
            {/* Lights */}
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            {/* Starfield */}
            <Stars
                radius={100}
                depth={50}
                count={5000}
                factor={4}
                saturation={0}
                fade
                speed={1}
            />

            {/* Sparkles */}
            <Sparkles
                count={300}
                scale={25}
                size={4}
                speed={0.4}
                opacity={0.6}
                color="#4FD1C5"
            />

            <Sparkles
                count={200}
                scale={30}
                size={2}
                speed={0.8}
                opacity={0.4}
                color="#ffffff"
            />

            {/* Rockets */}
            <Rocket />
            <Rocket />

            {/* Floating Emojis */}
            {emojis.map((data, i) => (
                <FloatingEmoji
                    key={i}
                    emoji={data.char}
                    position={data.pos}
                    speed={data.speed}
                    randomFactor={data.random}
                    mouseRef={mouseRef}
                />
            ))}

        </>
    );
};

/* -------------------------------------------------------------------------- */
/*                              Canvas Wrapper                                 */
/* -------------------------------------------------------------------------- */

const ThreeBackground = () => {
    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none bg-slate-900">
            <Canvas
                camera={{ position: [0, 0, 10], fov: 50 }}
                gl={{ alpha: true }}
            >
                <BackgroundScene />
            </Canvas>
        </div>
    );
};

export default ThreeBackground;
