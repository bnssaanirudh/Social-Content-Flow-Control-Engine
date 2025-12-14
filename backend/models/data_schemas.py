from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# --- Auth Models ---
class Token(BaseModel):
    access_token: str
    token_type: str

class UserLogin(BaseModel):
    username: str
    password: str

# --- NEW: Graph Data Structure (For User Uploads) ---
# These must be defined BEFORE SimulationConfig uses them
class GraphNode(BaseModel):
    id: str
    trust: float = 0.5 # Default trust if not provided

class GraphLink(BaseModel):
    source: str
    target: str

class CustomGraphData(BaseModel):
    nodes: List[GraphNode]
    links: List[GraphLink]

# --- Simulation Input ---
class SimulationConfig(BaseModel):
    content_text: str
    seed_nodes: int = 5
    num_nodes: int = 250
    risk_tolerance: float = 0.5
    strategy: str = "fuzzy_adaptive"
    simulation_steps: int = 15
    
    # --- NEW FEATURES ADDED ---
    custom_graph: Optional[CustomGraphData] = None # User uploaded data
    blocked_node_ids: List[str] = [] # List of nodes to REMOVE before sim

# --- Helper Model for Leaderboard ---
class TopInfluencer(BaseModel):
    id: str   # Correctly accepts Strings like "Titan-0"
    count: int

# --- Simulation Output (Per Step) ---
class SimulationStep(BaseModel):
    timestep: int
    active_spreaders: int
    total_reach: int
    
    # Correctly accepts Strings
    newly_activated: List[str]       
    activation_paths: List[List[str]] 
    
    live_top_5: List[TopInfluencer]

# --- Final API Response ---
class SimulationResponse(BaseModel):
    metadata: Dict[str, Any]
    graph_topology: Dict[str, Any]
    results: List[SimulationStep]