import React from 'react';

const FarmBackground = () => {
    return (
        <div className="farm-bg-container">
            <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" className="farm-svg">
                <defs>
                    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#87CEEB" />
                        <stop offset="100%" stopColor="#E0F6FF" />
                    </linearGradient>
                    <linearGradient id="hillGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#559155" />
                        <stop offset="100%" stopColor="#3c6b3c" />
                    </linearGradient>
                    <linearGradient id="hillGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6ebf6e" />
                        <stop offset="100%" stopColor="#4f914f" />
                    </linearGradient>
                    <linearGradient id="fieldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E8D07B" />
                        <stop offset="100%" stopColor="#cfa52f" />
                    </linearGradient>
                    <linearGradient id="dirtGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4A3424" />
                        <stop offset="100%" stopColor="#2E1C12" />
                    </linearGradient>
                </defs>

                {/* Sky */}
                <rect width="1200" height="800" fill="url(#skyGrad)" />

                {/* Sun */}
                <circle cx="800" cy="150" r="40" fill="#FFE87C" opacity="0.9" className="farm-sun" />

                {/* Moving Clouds */}
                <g className="farm-clouds-slow">
                    <path d="M 100 150 Q 120 120 150 150 Q 180 140 190 160 Q 210 180 180 190 L 100 190 Q 70 190 80 170 Q 80 150 100 150 Z" fill="#FFFFFF" opacity="0.7" />
                    <path d="M 500 100 Q 520 70 550 100 Q 580 90 590 110 Q 610 130 580 140 L 500 140 Q 470 140 480 120 Q 480 100 500 100 Z" fill="#FFFFFF" opacity="0.6" />
                    <path d="M 900 180 Q 930 140 970 180 Q 1000 170 1020 200 Q 1040 220 1000 230 L 900 230 Q 860 230 870 200 Q 860 180 900 180 Z" fill="#FFFFFF" opacity="0.8" />
                </g>
                <g className="farm-clouds-fast">
                    <path d="M 300 180 Q 320 150 350 180 Q 380 170 390 190 Q 410 210 380 220 L 300 220 Q 270 220 280 200 Q 280 180 300 180 Z" fill="#FFFFFF" opacity="0.5" />
                    <path d="M 1100 120 Q 1120 90 1150 120 Q 1180 110 1190 130 Q 1210 150 1180 160 L 1100 160 Q 1070 160 1080 140 Q 1080 120 1100 120 Z" fill="#FFFFFF" opacity="0.6" />
                    <path d="M -100 140 Q -80 110 -50 140 Q -20 130 -10 150 Q 10 170 -20 180 L -100 180 Q -130 180 -120 160 Q -120 140 -100 140 Z" fill="#FFFFFF" opacity="0.7" />
                </g>

                {/* Mountains in background */}
                <path d="M 0 500 L 0 380 L 150 250 L 300 380 L 400 320 L 550 450 L 700 350 L 850 480 L 1000 300 L 1200 450 L 1200 500 Z" fill="#9CA3AF" opacity="0.6" />
                <path d="M 200 500 L 250 400 L 400 260 L 550 400 L 700 320 L 900 480 L 1100 350 L 1200 420 L 1200 500 Z" fill="#6B7280" opacity="0.4" />

                {/* Back Hills */}
                <path d="M 0 550 Q 300 400 600 550 T 1200 550 L 1200 800 L 0 800 Z" fill="url(#hillGrad1)" />
                <path d="M -100 600 Q 350 450 800 600 T 1300 600 L 1300 800 L -100 800 Z" fill="url(#hillGrad2)" />

                {/* Dirt Path */}
                <path d="M 200 540 Q 300 560 400 620 T 700 700 L 1200 750 L 1200 800 L 0 800 L 0 650 Q 50 620 100 580 Z" fill="#8B5A2B" opacity="0.8" />

                {/* Farm House / Barn */}
                <g transform="translate(180, 420)">
                    {/* Barn Body */}
                    <path d="M 0 40 L 0 120 L 100 120 L 100 40 L 50 5 Z" fill="#DC2626" />
                    <path d="M -5 40 L 50 0 L 105 40 L 95 40 L 50 8 L 5 40 Z" fill="#991B1B" />
                    {/* Barn Doors */}
                    <rect x="30" y="70" width="40" height="50" fill="#FCA5A5" />
                    <path d="M 30 70 L 70 120 M 70 70 L 30 120" stroke="#DC2626" strokeWidth="2" />
                    <rect x="48" y="70" width="4" height="50" fill="#DC2626" />
                    <circle cx="50" cy="35" r="10" fill="#FCA5A5" />
                    <path d="M 50 25 L 50 45 M 40 35 L 60 35" stroke="#DC2626" strokeWidth="1.5" />

                    {/* Silo */}
                    <rect x="-40" y="20" width="35" height="100" fill="#D1D5DB" />
                    <path d="M -40 20 Q -22.5 -5 -5 20 Z" fill="#9CA3AF" />
                    <line x1="-22.5" y1="20" x2="-22.5" y2="120" stroke="#9CA3AF" strokeWidth="2" />
                    <line x1="-35" y1="40" x2="-10" y2="40" stroke="#9CA3AF" strokeWidth="2" />
                    <line x1="-35" y1="60" x2="-10" y2="60" stroke="#9CA3AF" strokeWidth="2" />
                    <line x1="-35" y1="80" x2="-10" y2="80" stroke="#9CA3AF" strokeWidth="2" />
                    <line x1="-35" y1="100" x2="-10" y2="100" stroke="#9CA3AF" strokeWidth="2" />
                </g>

                {/* Windmill */}
                <g transform="translate(350, 400)">
                    <polygon points="10,120 30,120 25,40 15,40" fill="#8B7E74" />
                    <polygon points="15,40 25,40 20,30" fill="#4A3C31" />
                    <g className="farm-windmill-spin" transform="origin(20px 35px)">
                        <circle cx="20" cy="35" r="3" fill="#332C27" />
                        {/* Blades */}
                        <polygon points="20,35 15,5 25,5" fill="#D1D5DB" />
                        <polygon points="20,35 15,65 25,65" fill="#D1D5DB" />
                        <polygon points="20,35 50,30 50,40" fill="#D1D5DB" />
                        <polygon points="20,35 -10,30 -10,40" fill="#D1D5DB" />
                        {/* Cross beams */}
                        <circle cx="20" cy="35" r="12" fill="transparent" stroke="#9CA3AF" strokeWidth="1" />
                        <circle cx="20" cy="35" r="22" fill="transparent" stroke="#9CA3AF" strokeWidth="1" />
                    </g>
                </g>

                {/* Trees */}
                <g transform="translate(50, 500)">
                    <rect x="18" y="30" width="8" height="30" fill="#78350F" />
                    <circle cx="22" cy="15" r="25" fill="#15803D" opacity="0.95" />
                    <circle cx="8" cy="25" r="18" fill="#166534" opacity="0.95" />
                    <circle cx="36" cy="25" r="18" fill="#14532D" opacity="0.95" />
                </g>
                <g transform="translate(450, 480) scale(0.8)">
                    <rect x="18" y="30" width="8" height="30" fill="#78350F" />
                    <circle cx="22" cy="15" r="25" fill="#15803D" opacity="0.95" />
                    <circle cx="8" cy="25" r="18" fill="#166534" opacity="0.95" />
                    <circle cx="36" cy="25" r="18" fill="#14532D" opacity="0.95" />
                </g>

                {/* Foreground Wheat Field */}
                <path d="M 0 650 Q 200 620 400 650 T 800 650 T 1200 650 L 1200 800 L 0 800 Z" fill="url(#fieldGrad)" />

                {/* Straw Bales */}
                <g transform="translate(250, 680)">
                    <ellipse cx="20" cy="15" rx="25" ry="12" fill="#D97706" />
                    <ellipse cx="20" cy="11" rx="25" ry="12" fill="#F59E0B" />
                    <line x1="10" y1="5" x2="10" y2="22" stroke="#B45309" strokeWidth="1.5" />
                    <line x1="30" y1="5" x2="30" y2="22" stroke="#B45309" strokeWidth="1.5" />
                    <ellipse cx="-5" cy="13" rx="5" ry="10" fill="#F59E0B" transform="rotate(-10 -5 13)" />
                </g>
                <g transform="translate(550, 700) scale(0.8)">
                    <ellipse cx="20" cy="15" rx="25" ry="12" fill="#D97706" />
                    <ellipse cx="20" cy="11" rx="25" ry="12" fill="#F59E0B" />
                    <line x1="10" y1="5" x2="10" y2="22" stroke="#B45309" strokeWidth="1.5" />
                    <line x1="30" y1="5" x2="30" y2="22" stroke="#B45309" strokeWidth="1.5" />
                </g>
                <g transform="translate(850, 660) scale(0.9)">
                    <ellipse cx="20" cy="15" rx="25" ry="12" fill="#D97706" />
                    <ellipse cx="20" cy="11" rx="25" ry="12" fill="#F59E0B" />
                    <line x1="10" y1="5" x2="10" y2="22" stroke="#B45309" strokeWidth="1.5" />
                    <line x1="30" y1="5" x2="30" y2="22" stroke="#B45309" strokeWidth="1.5" />
                </g>
                <g transform="translate(1050, 720) scale(1.1)">
                    <ellipse cx="20" cy="15" rx="25" ry="12" fill="#D97706" />
                    <ellipse cx="20" cy="11" rx="25" ry="12" fill="#F59E0B" />
                    <line x1="10" y1="5" x2="10" y2="22" stroke="#B45309" strokeWidth="1.5" />
                    <line x1="30" y1="5" x2="30" y2="22" stroke="#B45309" strokeWidth="1.5" />
                </g>

                {/* Animated Cows grazing */}
                <g transform="translate(700, 560)">
                    {/* Cow 1 */}
                    <path d="M 20 20 L 40 20 Q 45 20 45 25 L 45 35 L 40 35 L 40 45 L 35 45 L 35 35 L 25 35 L 25 45 L 20 45 L 20 25 Q 15 25 15 30 L 10 30 Q 10 20 20 20 Z" fill="#FFFFFF" />
                    <path d="M 25 22 Q 30 20 35 25 L 30 30 Z" fill="#78350F" />
                    <path d="M 40 25 Q 43 23 45 28 L 40 33 Z" fill="#78350F" />
                    <g className="farm-cow-head-1" transform="origin(20px 25px)">
                        <path d="M 20 25 L 10 25 L 10 32 L 20 32 Z" fill="#FFFFFF" />
                        <path d="M 8 28 L 12 28 L 12 33 L 8 33 Z" fill="#FCA5A5" />
                        <circle cx="15" cy="27" r="1.5" fill="#1E293B" />
                        <path d="M 18 20 Q 15 22 18 25 Z" fill="#78350F" />
                    </g>
                </g>

                <g transform="translate(850, 580) scale(0.9) translate(50, 0) scale(-1, 1)">
                    {/* Cow 2 (Facing Left because of scale -1, 1) */}
                    <path d="M 20 20 L 40 20 Q 45 20 45 25 L 45 35 L 40 35 L 40 45 L 35 45 L 35 35 L 25 35 L 25 45 L 20 45 L 20 25 Q 15 25 15 30 L 10 30 Q 10 20 20 20 Z" fill="#FFFFFF" />
                    <path d="M 22 25 Q 28 20 30 28 L 25 32 Z" fill="#1E293B" />
                    <path d="M 38 22 Q 42 20 44 26 L 38 30 Z" fill="#1E293B" />
                    <g className="farm-cow-head-2" transform="origin(20px 25px)">
                        <path d="M 20 25 L 10 25 L 10 32 L 20 32 Z" fill="#FFFFFF" />
                        <path d="M 8 28 L 12 28 L 12 33 L 8 33 Z" fill="#FCA5A5" />
                        <circle cx="15" cy="27" r="1.5" fill="#1E293B" />
                    </g>
                </g>

                <g transform="translate(600, 575) scale(0.85)">
                    {/* Cow 3 (Brown) */}
                    <path d="M 20 20 L 40 20 Q 45 20 45 25 L 45 35 L 40 35 L 40 45 L 35 45 L 35 35 L 25 35 L 25 45 L 20 45 L 20 25 Q 15 25 15 30 L 10 30 Q 10 20 20 20 Z" fill="#92400E" />
                    <g className="farm-cow-head-1" transform="origin(20px 25px)">
                        <path d="M 20 25 L 10 25 L 10 32 L 20 32 Z" fill="#92400E" />
                        <path d="M 8 28 L 12 28 L 12 33 L 8 33 Z" fill="#1E293B" />
                        <circle cx="15" cy="27" r="1.5" fill="#FFFFFF" />
                        <path d="M 18 20 Q 15 22 18 25 Z" fill="#B45309" />
                    </g>
                </g>

                {/* Dirt trench for tractor */}
                <path d="M 0 780 L 1200 780 L 1200 800 L 0 800 Z" fill="url(#dirtGrad)" />

                {/* Animated Tractor driving across screen */}
                <g className="farm-tractor-anim">
                    {/* Base */}
                    <path d="M 30 20 L 80 20 L 90 40 L 110 40 L 110 60 L 20 60 Z" fill="#10B981" />
                    <rect x="20" y="20" width="30" height="30" fill="#047857" />
                    {/* Window */}
                    <rect x="35" y="25" width="15" height="15" fill="#93C5FD" opacity="0.8" />
                    {/* Exhaust */}
                    <rect x="90" y="10" width="4" height="30" fill="#4B5563" />
                    <circle cx="92" cy="10" r="3" fill="#4B5563" />
                    {/* Smoke puffs from exhaust */}
                    <g className="farm-tractor-smoke">
                        <circle cx="92" cy="-5" r="5" fill="#D1D5DB" opacity="0.6" />
                        <circle cx="96" cy="-15" r="7" fill="#D1D5DB" opacity="0.4" />
                        <circle cx="102" cy="-25" r="10" fill="#D1D5DB" opacity="0.2" />
                    </g>
                    {/* Back wheel */}
                    <circle cx="40" cy="65" r="20" fill="#1F2937" className="farm-wheel-spin" transform="origin(40px 65px)" />
                    <circle cx="40" cy="65" r="12" fill="#D1D5DB" />
                    <circle cx="40" cy="65" r="4" fill="#DC2626" />
                    {/* Front wheel */}
                    <circle cx="95" cy="72" r="13" fill="#1F2937" className="farm-wheel-spin" transform="origin(95px 72px)" />
                    <circle cx="95" cy="72" r="8" fill="#D1D5DB" />
                    <circle cx="95" cy="72" r="3" fill="#DC2626" />

                    {/* Plow / Harvester attached to back */}
                    <rect x="-10" y="55" width="30" height="5" fill="#4B5563" />
                    <polygon points="-20,50 -10,50 -10,70 -30,70" fill="#DC2626" />
                    <path d="M -30 70 Q -40 80 -20 80" fill="transparent" stroke="#D1D5DB" strokeWidth="4" />
                    <path d="M -20 70 Q -30 80 -10 80" fill="transparent" stroke="#D1D5DB" strokeWidth="4" />
                    <path d="M -10 70 Q -20 80 0 80" fill="transparent" stroke="#D1D5DB" strokeWidth="4" />
                </g>
            </svg>
        </div>
    );
};

export default FarmBackground;
