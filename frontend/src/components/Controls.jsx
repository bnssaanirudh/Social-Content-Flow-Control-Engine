import React, { useRef } from 'react';
import { Play, Loader2, UploadCloud, FileJson } from 'lucide-react';

const Controls = ({ config, setConfig, onRun, loading }) => {
    const fileInputRef = useRef(null);

    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                // Basic validation
                if (json.nodes && json.links) {
                    setConfig(prev => ({ 
                        ...prev, 
                        custom_graph: json,
                        num_nodes: json.nodes.length // Auto-update count
                    }));
                    alert(`Dataset loaded: ${json.nodes.length} users, ${json.links.length} connections.`);
                } else {
                    alert("Invalid JSON format. Needs 'nodes' and 'links' arrays.");
                }
            } catch (err) {
                alert("Error parsing JSON file.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex flex-col gap-5 h-full">
            {/* ... Content Text Input (Same as before) ... */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                    Content Text (Neural Scan)
                </label>
                <textarea 
                    className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                    rows="2"
                    value={config.content_text}
                    onChange={(e) => handleChange('content_text', e.target.value)}
                    placeholder="Enter message..."
                />
            </div>

            {/* --- NEW: DATASET UPLOAD --- */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                    Network Dataset
                </label>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={handleFileUpload}
                />
                <button 
                    onClick={() => fileInputRef.current.click()}
                    className={`w-full border border-dashed rounded-lg p-3 flex items-center justify-center gap-2 text-sm transition-all
                        ${config.custom_graph 
                            ? 'border-green-500 text-green-400 bg-green-500/10' 
                            : 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400 hover:bg-gray-800'
                        }`}
                >
                    {config.custom_graph ? <FileJson size={16}/> : <UploadCloud size={16}/>}
                    {config.custom_graph ? "Custom Data Loaded" : "Upload JSON Dataset"}
                </button>
                {config.custom_graph && (
                    <button 
                        onClick={() => setConfig(prev => ({...prev, custom_graph: null}))}
                        className="text-[10px] text-red-400 mt-1 hover:underline w-full text-right"
                    >
                        Clear Data (Use Random)
                    </button>
                )}
            </div>

            {/* Strategy Select (Same as before) */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Strategy</label>
                <select 
                    className="w-full bg-black/40 border border-gray-700 rounded-lg p-2.5 text-sm text-gray-200 outline-none"
                    value={config.strategy}
                    onChange={(e) => handleChange('strategy', e.target.value)}
                >
                    <option value="fuzzy_adaptive">Fuzzy Logic Adaptive</option>
                    <option value="genetic_optimized">Genetic Algorithm Opt.</option>
                </select>
            </div>

            {/* Blocked Nodes Display */}
            {config.blocked_node_ids && config.blocked_node_ids.length > 0 && (
                <div className="bg-red-900/20 border border-red-900/50 p-2 rounded text-xs text-red-300">
                    <strong>{config.blocked_node_ids.length} Nodes Blocked</strong>
                    <div className="truncate opacity-70">{config.blocked_node_ids.join(", ")}</div>
                </div>
            )}

            {/* Run Button */}
            <div className="mt-auto pt-2">
                <button 
                    onClick={onRun}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={20}/> : <Play size={20} fill="currentColor"/>}
                    {loading ? "PROCESSING..." : "RUN SIMULATION"}
                </button>
            </div>
        </div>
    );
};

export default Controls;