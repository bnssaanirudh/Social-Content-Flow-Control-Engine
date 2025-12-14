import React, { useMemo, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const NetworkViz = ({ graphData, activePaths, liveTop5, onNodeClick, blockedNodes = [] }) => {
    const fgRef = useRef();

    // ---------------------------------------------------------
    // 1. DATA PROCESSING (Merged Old Logic with New Colors)
    // ---------------------------------------------------------
    const processedGraph = useMemo(() => {
        if (!graphData || !graphData.nodes) return { nodes: [], links: [] };

        // --- STEP A: Calculate Influence (Degrees) ---
        const rawLinks = graphData.links || graphData.edges || [];
        const degrees = {};
        
        rawLinks.forEach(link => {
            const src = typeof link.source === 'object' ? link.source.id : link.source;
            const trg = typeof link.target === 'object' ? link.target.id : link.target;
            degrees[src] = (degrees[src] || 0) + 1;
            degrees[trg] = (degrees[trg] || 0) + 1;
        });

        // --- STEP B: Sort to Determine Roles ---
        const sortedNodes = [...graphData.nodes].sort((a, b) => (degrees[b.id] || 0) - (degrees[a.id] || 0));
        const total = sortedNodes.length;
        const titanCount = Math.ceil(total * 0.02);
        const macroCount = Math.ceil(total * 0.10);

        // --- STEP C: Create ID Mapping & Assign NEW Colors ---
        const idMap = {};
        
        const processedNodes = graphData.nodes.map(node => {
            const index = sortedNodes.findIndex(n => n.id === node.id);
            let cat = 'Nano';
            let color = '#9CA3AF'; // Light Grey (Nano on White)
            let size = 4;
            let newId = `User-${node.id}`; // Default Name

            // Using your logic but updating colors for White BG
            if (index < titanCount) {
                cat = 'Titan';
                color = '#D97706'; // Amber-600 (Titan)
                size = 18;
                newId = `Titan-${node.id}`;
            } else if (index < titanCount + macroCount) {
                cat = 'Macro';
                color = '#DC2626'; // Red-600 (Macro)
                size = 10;
                newId = `Macro-${node.id}`;
            } else {
                cat = 'Micro';
                color = '#059669'; // Emerald-600 (Micro)
                size = 6;
                newId = `User-${node.id}`;
            }

            // Store mapping
            idMap[node.id] = newId;

            return { 
                ...node, 
                id: newId, 
                originalId: node.id,
                cat, 
                baseColor: color, 
                val: size 
            };
        });

        // --- STEP D: Remap Links ---
        const processedLinks = rawLinks.map(link => {
            const srcId = typeof link.source === 'object' ? link.source.id : link.source;
            const trgId = typeof link.target === 'object' ? link.target.id : link.target;
            
            return {
                source: idMap[srcId] || srcId,
                target: idMap[trgId] || trgId
            };
        });

        return { nodes: processedNodes, links: processedLinks };
    }, [graphData]);

    // ---------------------------------------------------------
    // 2. ACTIVE PATHS SET
    // ---------------------------------------------------------
    const activeLinkSet = useMemo(() => {
        const set = new Set();
        if (activePaths) {
            activePaths.forEach(path => {
                set.add(`${path[0]}-${path[1]}`);
                set.add(`${path[1]}-${path[0]}`);
            });
        }
        return set;
    }, [activePaths]);

    // ---------------------------------------------------------
    // 3. HELPER: Link Active Checker
    // ---------------------------------------------------------
    const isLinkActive = useCallback((link) => {
        const src = typeof link.source === 'object' ? link.source.id : link.source;
        const trg = typeof link.target === 'object' ? link.target.id : link.target;
        return activeLinkSet.has(`${src}-${trg}`);
    }, [activeLinkSet]);

    // ---------------------------------------------------------
    // 4. RENDER (New Visuals)
    // ---------------------------------------------------------
    return (
        <div className="w-full h-full bg-white cursor-pointer">
            <ForceGraph2D
                ref={fgRef}
                graphData={processedGraph}
                backgroundColor="#ffffff" // White Background
                
                // --- CLICK TO BLOCK ---
                onNodeClick={(node) => {
                    if (onNodeClick) onNodeClick(node.id);
                }}

                // --- NODE DRAWING ---
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const isBlocked = blockedNodes.includes(node.id);

                    // Draw Node Body
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                    
                    // IF BLOCKED: Black. ELSE: Role Color.
                    ctx.fillStyle = isBlocked ? '#000000' : node.baseColor;
                    ctx.fill();

                    // Visuals for Blocked vs Infected
                    if (isBlocked) {
                        // Red X + Border
                        ctx.strokeStyle = '#EF4444';
                        ctx.lineWidth = 3;
                        ctx.stroke();
                        
                        ctx.beginPath();
                        ctx.lineWidth = 2;
                        const s = node.val * 0.6;
                        ctx.moveTo(node.x - s, node.y - s); ctx.lineTo(node.x + s, node.y + s);
                        ctx.moveTo(node.x + s, node.y - s); ctx.lineTo(node.x - s, node.y + s);
                        ctx.stroke();
                    } 
                    else if (node.state === 1) {
                        // Purple Ring
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val + 4, 0, 2 * Math.PI, false);
                        ctx.strokeStyle = 'rgba(124, 58, 237, 0.8)';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }

                    // Labels (Show for Titans, Zoom, or Blocked)
                    if (node.cat === 'Titan' || globalScale > 2.5 || isBlocked) {
                        const label = node.id;
                        const fontSize = 12 / globalScale;
                        ctx.font = `bold ${fontSize}px Sans-Serif`;
                        
                        // Red text if blocked, Black otherwise
                        ctx.fillStyle = isBlocked ? '#EF4444' : '#000000';
                        
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(label, node.x, node.y + node.val + fontSize + 2);
                    }
                }}
                
                // --- EDGES ---
                linkColor={link => isLinkActive(link) ? "#00AEEF" : "#E5E7EB"} // Cyan Active / Light Grey Inactive
                linkWidth={link => isLinkActive(link) ? 3 : 1}
                
                // --- PARTICLES ---
                linkDirectionalParticles={link => isLinkActive(link) ? 4 : 0}
                linkDirectionalParticleSpeed={link => isLinkActive(link) ? 0.015 : 0} // Slightly faster
                linkDirectionalParticleWidth={5}
                linkDirectionalParticleColor={() => "#00AEEF"}
            />
        </div>
    );
};

export default NetworkViz;