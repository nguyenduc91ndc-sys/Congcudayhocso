import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users, Eye, Calendar, Wrench, Trophy, Target, BarChart2 } from 'lucide-react';
import { getVisitStats } from '../utils/visitCounter';
import { getUniqueUserCount, getTodayLoginCount } from '../utils/firebaseVisitors';

// ═══════════════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════════════
const AnimatedCounter: React.FC<{ target: number; suffix?: string; duration?: number }> = ({
    target, suffix = '', duration = 2000
}) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (hasAnimated.current || target <= 0) return;
        hasAnimated.current = true;

        const start = performance.now();
        const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [target, duration]);

    return (
        <div ref={ref} className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight">
            {count.toLocaleString()}{suffix}
        </div>
    );
};

// ═══════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════
const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number;
    suffix?: string;
    color: string;
    glowColor: string;
    delay: number;
}> = ({ icon, label, value, suffix, color, glowColor, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay, duration: 0.5 }}
        className="relative group"
    >
        <div className={`absolute -inset-1 ${glowColor} rounded-2xl opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-500`} />
        <div className="relative bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6 hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
            <div className={`absolute top-0 left-6 right-6 h-[2px] ${color} rounded-full opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className={`w-11 h-11 rounded-xl ${color} bg-opacity-20 flex items-center justify-center mb-4`}
                style={{ background: `linear-gradient(135deg, ${color.includes('purple') ? 'rgba(139,92,246,0.15)' : color.includes('blue') ? 'rgba(59,130,246,0.15)' : color.includes('green') ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'})` }}>
                {icon}
            </div>
            <AnimatedCounter target={value} suffix={suffix} />
            <div className="text-sm text-white/50 font-medium mt-1">{label}</div>
        </div>
    </motion.div>
);

// ═══════════════════════════════════════════════
// NEW MONTHLY CHART — Người dùng mới theo tháng (Bar Chart Demo)
// ═══════════════════════════════════════════════
const MonthlyChart: React.FC = () => {
    const data = [
        { label: 'T1', value: 30 }, { label: 'T2', value: 45 }, { label: 'T3', value: 60 },
        { label: 'T4', value: 50 }, { label: 'T5', value: 85 }, { label: 'T6', value: 70 },
        { label: 'T7', value: 55 }, { label: 'T8', value: 40 }, { label: 'T9', value: 110 },
        { label: 'T10', value: 130 }, { label: 'T11', value: 160 }, { label: 'T12', value: 140 },
    ];
    const max = Math.max(...data.map(d => d.value));

    const getColor = (i: number, len: number) => {
        const h1 = 260; // purple
        const h2 = 140; // green
        const h = h1 - ((h1 - h2) * (i / (len - 1)));
        return `hsl(${h}, 80%, 60%)`;
    };

    return (
        <div className="flex items-end gap-1 sm:gap-3 h-48 sm:h-56 px-2 mt-4">
            {data.map((d, i) => {
                const pct = Math.max((d.value / max) * 100, 5); // Minimum 5% height
                const color = getColor(i, data.length);
                return (
                    <motion.div
                        key={d.label}
                        className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                    >
                        {/* Tooltip */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            {d.value} người
                        </div>

                        {/* Bar Container - Fixed height context */}
                        <div className="w-full relative flex-1 flex flex-col justify-end items-center">
                            <motion.div
                                className="w-full max-w-[28px] sm:max-w-[36px] rounded-t-xl cursor-pointer"
                                style={{ background: `linear-gradient(to top, ${color}66, ${color})` }}
                                initial={{ height: 0 }}
                                animate={{ height: `${pct}%` }}
                                transition={{ delay: 0.5 + i * 0.05, duration: 0.8, ease: "easeOut" }}
                                whileHover={{ filter: 'brightness(1.2)' }}
                            />
                        </div>

                        {/* Label */}
                        <span className="text-[10px] sm:text-xs text-white/40 font-medium h-4 flex-shrink-0">{d.label}</span>
                    </motion.div>
                );
            })}
        </div>
    );
};

// ═══════════════════════════════════════════════
// TOP TOOLS CHART — Top công cụ được sử dụng
// ═══════════════════════════════════════════════
const TopToolsChart: React.FC = () => {
    const data = [
        { name: 'Ong Vàng Kiến Thức', pct: 85, color: '#f59e0b' },
        { name: 'Tạo Video Bài Giảng', pct: 72, color: '#3b82f6' },
        { name: 'Thẩm Văn AI', pct: 65, color: '#8b5cf6' },
        { name: 'Đồng Hồ Tương Tác', pct: 58, color: '#10b981' },
        { name: 'Vòng Quay May Mắn', pct: 50, color: '#ef4444' },
        { name: 'Hình Học 3D', pct: 42, color: '#0ea5e9' },
    ];

    return (
        <div className="space-y-4 pt-2">
            {data.map((d, i) => (
                <motion.div
                    key={d.name}
                    className="flex items-center gap-3 sm:gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                >
                    <div className="w-32 sm:w-40 text-[11px] sm:text-sm text-white/80 font-medium truncate text-right">
                        {d.name}
                    </div>
                    <div className="flex-1 h-6 sm:h-8 bg-white/5 rounded-full overflow-hidden relative flex items-center">
                        <motion.div
                            className="absolute left-0 top-0 bottom-0 rounded-full"
                            style={{ background: d.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${d.pct}%` }}
                            transition={{ delay: 0.6 + i * 0.1, duration: 0.8 }}
                        />
                        <span className="relative z-10 text-[10px] sm:text-xs font-bold text-white px-3 drop-shadow-md">
                            {d.pct}%
                        </span>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════
// USER SEGMENTS CHART — Phân loại người dùng
// ═══════════════════════════════════════════════
const UserSegmentsChart: React.FC = () => {
    const segments = [
        { label: 'Giáo viên Tiểu học', pct: 45, color: '#8b5cf6' },
        { label: 'Giáo viên THCS', pct: 30, color: '#3b82f6' },
        { label: 'Giáo viên THPT', pct: 15, color: '#10b981' },
        { label: 'Khác', pct: 10, color: '#f59e0b' },
    ];

    const renderConicGradient = () => {
        return `conic-gradient(
            #8b5cf6 0% 45%, 
            #3b82f6 45% 75%, 
            #10b981 75% 90%, 
            #f59e0b 90% 100%
        )`;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-8 justify-center h-full py-6">
            <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: 'spring', damping: 15 }}
                className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{ background: renderConicGradient() }}
            >
                <div className="absolute inset-0 m-auto w-20 h-20 sm:w-28 sm:h-28 rounded-full shadow-inner" style={{ background: '#0f172a' }}></div>
            </motion.div>

            <div className="flex flex-col gap-3">
                {segments.map((seg, i) => (
                    <motion.div
                        key={seg.label}
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                    >
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" style={{ background: seg.color }}></div>
                        <span className="text-xs sm:text-sm text-white/70">{seg.label} ({seg.pct}%)</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
const AnalyticsTab: React.FC = () => {
    const [totalVisits, setTotalVisits] = useState(0);
    const [uniqueUsers, setUniqueUsers] = useState(0);
    const [todayLogins, setTodayLogins] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [visitStats, unique, today] = await Promise.all([
                    getVisitStats(),
                    getUniqueUserCount(),
                    getTodayLoginCount(),
                ]);

                setTotalVisits(visitStats.totalVisits);
                setUniqueUsers(unique);
                setTodayLogins(today);
            } catch (err) {
                console.error('Error loading analytics:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-white/40 text-sm">Đang tải dữ liệu thống kê...</span>
                </div>
            </div>
        );
    }

    const TOTAL_TOOLS = 22; // Số công cụ hiện có trên nền tảng

    return (
        <section className="space-y-6 pb-8">
            <motion.div
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <BarChart2 size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Thống kê chi tiết</h2>
                        <p className="text-xs text-white/50">Dữ liệu hiệu suất nền tảng</p>
                    </div>
                </div>
            </motion.div>

            {/* ── 4 Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                    icon={<Eye size={18} className="text-purple-400" />}
                    label="Tổng lượt truy cập"
                    value={totalVisits}
                    color="bg-purple-500"
                    glowColor="bg-purple-500"
                    delay={0.1}
                />
                <StatCard
                    icon={<Users size={18} className="text-blue-400" />}
                    label="Người dùng"
                    value={uniqueUsers}
                    color="bg-blue-500"
                    glowColor="bg-blue-500"
                    delay={0.2}
                />
                <StatCard
                    icon={<Calendar size={18} className="text-green-400" />}
                    label="Truy cập hôm nay"
                    value={todayLogins}
                    color="bg-green-500"
                    glowColor="bg-green-500"
                    delay={0.3}
                />
                <StatCard
                    icon={<Wrench size={18} className="text-amber-400" />}
                    label="Công cụ sử dụng"
                    value={TOTAL_TOOLS}
                    suffix="+"
                    color="bg-amber-500"
                    glowColor="bg-amber-500"
                    delay={0.4}
                />
            </div>

            {/* ── Full Width Bar Chart ── */}
            <motion.div
                className="bg-white/[0.04] backdrop-blur-xl border border-white/8 rounded-2xl p-5 sm:p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="flex items-center gap-2 mb-5">
                    <Users size={16} className="text-purple-400" />
                    <h3 className="text-sm font-semibold text-white/70">Người dùng mới theo tháng</h3>
                </div>
                <MonthlyChart />
            </motion.div>

            {/* ── 2 Column Charts: Tools & Users ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <motion.div
                    className="bg-white/[0.04] backdrop-blur-xl border border-white/8 rounded-2xl p-5 sm:p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="flex items-center gap-2 mb-5">
                        <Trophy size={16} className="text-yellow-400" />
                        <h3 className="text-sm font-semibold text-white/70">Top công cụ được sử dụng</h3>
                    </div>
                    <TopToolsChart />
                </motion.div>

                <motion.div
                    className="bg-white/[0.04] backdrop-blur-xl border border-white/8 rounded-2xl p-5 sm:p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="flex items-center gap-2 mb-5">
                        <Target size={16} className="text-red-400" />
                        <h3 className="text-sm font-semibold text-white/70">Phân loại người dùng</h3>
                    </div>
                    <UserSegmentsChart />
                </motion.div>
            </div>
        </section>
    );
};

export default AnalyticsTab;
