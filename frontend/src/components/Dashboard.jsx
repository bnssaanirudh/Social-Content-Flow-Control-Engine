import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- FIXED IMPORT: Added 'ShieldCheck' to the list ---
import { 
    Play, Pause, RotateCcw, Activity, ShieldAlert, Zap, Terminal, Network, 
    Lock, Cpu, GitBranch, Download, Ban, BarChart3, Globe, Share2, ShieldCheck 
} from 'lucide-react';

import { CpuChipIcon, ArrowsRightLeftIcon, BeakerIcon, ChartBarIcon, ShieldCheckIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import Controls from './Controls';
import NetworkViz from './NetworkViz';
import { login, runSimulation } from '../services/api';

// Stat Card Component
const StatCard = ({ icon: Icon, title, value, subtext, colorClass }) => (
    <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm hover:border-gray-700 transition-colors">
        <Icon size={18} className={colorClass} />
        <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{title}</div>
            <div className="text-lg font-bold text-white flex items-baseline gap-1">
                {value} <span className="text-xs text-gray-600 font-normal">{subtext}</span>
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    // --- State ---
    const [token, setToken] = useState(null);
    const [data, setData] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [liveTop5, setLiveTop5] = useState([]); 
    const [blockedNodes, setBlockedNodes] = useState([]); 
    const playbackInterval = useRef(null);

    const [config, setConfig] = useState({
        content_text: "Urgent! Crypto scam alert.",
        seed_nodes: 5,
        num_nodes: 250,
        risk_tolerance: 0.5,
        strategy: "fuzzy_adaptive",
        custom_graph: null,
        blocked_node_ids: []
    });

    const PLAYBACK_SPEED_MS = 1500; 

    // --- Animation Loop ---
    useEffect(() => {
        if (isPlaying && data && data.results) {
            playbackInterval.current = setInterval(() => {
                setCurrentStep(prev => {
                    if (prev >= data.results.length - 1) { setIsPlaying(false); return prev; }
                    const nextStep = prev + 1;
                    if (data.results[nextStep]?.live_top_5) setLiveTop5(data.results[nextStep].live_top_5);
                    return nextStep;
                });
            }, PLAYBACK_SPEED_MS); 
        } else { clearInterval(playbackInterval.current); }
        return () => clearInterval(playbackInterval.current);
    }, [isPlaying, data]);

    // --- Handlers ---
    const handleLogin = async () => { try { const res = await login("admin", "admin123"); setToken(res.access_token); } catch(e) { alert("Login failed. Check Backend!"); } };

    const handleRun = async () => {
        setIsPlaying(false); setCurrentStep(0); setLiveTop5([]); 
        try {
            const runConfig = { ...config, blocked_node_ids: blockedNodes };
            const res = await runSimulation(token, runConfig);
            setData(res);
            if (res.results?.[0]?.live_top_5) setLiveTop5(res.results[0].live_top_5);
            setIsPlaying(true); 
        } catch(e) { alert("Sim failed: " + e.message); }
    };

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentStep(0);
        setBlockedNodes([]); // <--- ADD THIS: Clears the blocked list on reset
        // Also clear from config if you want a full wipe
        setConfig(prev => ({ ...prev, blocked_node_ids: [] }));
        
        if (data?.results?.[0]) {
            setLiveTop5(data.results[0].live_top_5);
        }
    };

    const handleNodeClick = (nodeId) => {
        setBlockedNodes(prev => prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]);
    };

    const downloadReport = async () => {
        if(!data) return;
        try {
            const payload = { results: data, config: config };
            const response = await fetch('http://localhost:8000/generate_pdf_report', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("PDF generation failed");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `SCFCE_Report_${new Date().toISOString().slice(0,10)}.pdf`; a.click();
        } catch(e) { alert("Download failed: " + e.message); }
    };

    const getInsights = () => {
        if (!data) return { currentReach: 0, totalNodes: 0, saturation: 0, velocity: 0 };
        const totalNodes = data.graph_topology.nodes.length;
        const currentReach = data.results[currentStep]?.total_reach || 0;
        const saturation = ((currentReach / totalNodes) * 100).toFixed(1);
        const velocity = data.results[currentStep]?.newly_activated.length || 0;
        return { totalNodes, currentReach, saturation, velocity };
    };
    const stats = getInsights();
    const currentActivePaths = data?.results[currentStep]?.activation_paths || [];
    const riskScore = data?.metadata?.calculated_risk || 0;

    // --- LANDING PAGE ---
    if (!token) {
        return (
            <div className="min-h-screen bg-[#0B0F19] text-gray-100 font-sans selection:bg-blue-500/30">
                {/* Navbar */}
                <nav className="border-b border-gray-800 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white">S</div>
                            <span className="font-bold text-lg tracking-tight">SCFCE <span className="text-gray-500 font-normal">Platform</span></span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-gray-400">v2.4.0-stable</span>
                            <button onClick={handleLogin} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-500/20">Login</button>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <div className="relative pt-24 pb-32 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px]"></div>
                        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]"></div>
                    </div>

                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800/50 border border-gray-700 text-blue-400 text-xs font-medium mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            AI-Powered Threat Detection Live
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight">
                            Predict & Neutralize <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Viral Misinformation</span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                            The advanced simulation engine for social networks. Deploy Neural Networks, Fuzzy Logic, and Genetic Algorithms to safeguard your community.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button onClick={handleLogin} className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5">
                                <CpuChipIcon className="w-6 h-6"/> Access Console
                            </button>
                            <a href="#features" className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-white rounded-xl font-bold text-lg hover:bg-gray-700 transition-all flex items-center justify-center gap-2 border border-gray-700">
                                <ChartBarIcon className="w-6 h-6"/> View Features
                            </a>
                        </div>
                    </div>
                </div>

                {/* Features Grid */}
                <div id="features" className="py-24 border-t border-gray-800 bg-[#0B0F19]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-white mb-4">Enterprise-Grade Capabilities</h2>
                            <p className="text-gray-400">Comprehensive tools for analyzing information flow dynamics.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { icon: BarChart3, title: "Real-time Analytics", desc: "Monitor propagation velocity and saturation live.", color: "text-blue-400" },
                                { icon: Share2, title: "Topology Mapping", desc: "Visualize connections and identify super-spreaders.", color: "text-purple-400" },
                                { icon: ShieldCheck, title: "Threat Mitigation", desc: "Test ban strategies and node blocking effects.", color: "text-green-400" },
                                { icon: Globe, title: "Custom Datasets", desc: "Upload your own network data for tailored sims.", color: "text-orange-400" }
                            ].map((feature, idx) => (
                                <div key={idx} className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl hover:border-gray-700 transition-colors">
                                    <feature.icon className={`w-8 h-8 ${feature.color} mb-4`} />
                                    <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                                    <p className="text-sm text-gray-400">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- MAIN DASHBOARD ---
    return (
        <div className="min-h-screen bg-gray-950 p-6 lg:p-10 flex flex-col items-center">
            <div className="w-full max-w-[1800px] bg-[#0B0F19] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col min-h-[85vh]">
                <header className="px-8 py-5 border-b border-gray-800 bg-[#0B0F19] flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">S</div>
                        <div><h1 className="text-xl font-bold text-white tracking-tight">SCFCE Platform</h1><div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono uppercase"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> System Online</div></div>
                    </div>
                    <div className="flex gap-6 items-center">
                        <button onClick={downloadReport} disabled={!data} className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-bold text-gray-300 hover:bg-gray-700 hover:text-white transition disabled:opacity-50"><Download size={16}/> Report</button>
                        <div className="w-px h-8 bg-gray-800"></div>
                        <StatCard icon={Activity} title="Velocity" value={stats.velocity} subtext="nodes/s" colorClass="text-purple-400" />
                        <StatCard icon={ShieldAlert} title="Saturation" value={stats.saturation + "%"} subtext="" colorClass={stats.saturation > 80 ? "text-red-400" : "text-blue-400"} />
                        <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl w-44 shadow-md flex flex-col justify-center">
                             <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1.5">
                                <span>Risk Score</span><span className={riskScore > 0.7 ? "text-red-500" : "text-green-500"}>{(riskScore * 100).toFixed(0)}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${riskScore > 0.7 ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${riskScore * 100}%`}}></div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-grow p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0B0F19]">
                    <div className="lg:col-span-3 flex flex-col gap-6">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-xl"><Controls config={config} setConfig={setConfig} onRun={handleRun} loading={false} /></div>
                        {blockedNodes.length > 0 && <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-xs text-red-300 flex items-center gap-2"><Ban size={14}/> {blockedNodes.length} Blocked. Re-run sim to apply.</div>}
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-0 flex flex-col h-[300px] overflow-hidden shadow-xl">
                            <div className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur"><h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><Terminal size={14}/> Transmission Log</h3></div>
                            <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar bg-black/20">
                                {currentActivePaths.map((path, i) => (
                                    <div key={i} className="flex items-center gap-3 text-xs font-mono p-2 rounded hover:bg-white/5 border border-transparent hover:border-gray-800 transition-all">
                                        <span className="text-yellow-500 font-bold">{path[0]}</span><span className="text-gray-600">➔</span><span className="text-red-400">{path[1]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-6 flex flex-col gap-4">
                        <div className="bg-gray-900 rounded-xl shadow-2xl relative overflow-hidden h-[600px] border border-gray-800">
                             <div className="absolute top-4 left-4 z-10 bg-gray-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-700 text-[10px] font-bold text-gray-300 shadow-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> LIVE TOPOLOGY
                            </div>
                            <div className="absolute top-4 right-4 z-10 text-[10px] text-gray-500 bg-gray-900/50 px-2 py-1 rounded border border-gray-700">Click node to Block/Unblock</div>
                            {data ? <NetworkViz graphData={data.graph_topology} activePaths={currentActivePaths} liveTop5={liveTop5} onNodeClick={handleNodeClick} blockedNodes={blockedNodes}/> : 
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 opacity-50 bg-black/20"><Network size={64} /><p className="mt-4 font-mono text-sm">READY</p></div>}
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-4 shadow-lg">
                            <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-full text-white transition shadow-lg active:scale-95">{isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}</button>
                            <button onClick={handleReset} className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 transition active:scale-95"><RotateCcw size={18} /></button>
                            <div className="flex-grow"><input type="range" min="0" max={data?.results?.length - 1 || 0} value={currentStep} onChange={(e) => { setIsPlaying(false); setCurrentStep(Number(e.target.value)); }} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/></div>
                        </div>
                    </div>

                    <div className="lg:col-span-3 flex flex-col gap-6">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-0 flex flex-col h-[350px] overflow-hidden shadow-xl">
                            <div className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur"><h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><Zap size={14} className="text-yellow-400" /> Top Spreaders</h3></div>
                            <div className="flex-grow overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                {liveTop5.map((node, i) => (<div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5"><span className="text-xs text-gray-200">{node.id}</span><span className="text-cyan-400 font-bold text-xs">{node.count}</span></div>))}
                            </div>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col h-[300px] shadow-xl"><h3 className="text-xs font-bold text-gray-300 uppercase mb-4">Impact Curve</h3><div className="flex-grow -ml-4">
                            {data && <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.results}><Area type="monotone" dataKey="total_reach" stroke="#3B82F6" fill="#3B82F6" /></AreaChart></ResponsiveContainer>}
                        </div></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Dashboard;