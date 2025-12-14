import networkx as nx
import torch
import torch.nn.functional as F
from torch_geometric.nn import GCNConv
from torch_geometric.utils import from_networkx
import numpy as np
import random

# --- 1. KEEP YOUR EXISTING GCN MODEL ---
class GCN(torch.nn.Module):
    def __init__(self, in_channels, out_channels):
        super(GCN, self).__init__()
        self.conv1 = GCNConv(in_channels, 16)
        self.conv2 = GCNConv(16, out_channels)

    def forward(self, data):
        x, edge_index = data.x, data.edge_index
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, training=self.training)
        x = self.conv2(x, edge_index)
        return torch.sigmoid(x)

# --- 2. UPDATE SOCIAL GRAPH TO HANDLE UPLOADS ---
class SocialGraph:
    def __init__(self, num_nodes=200, custom_data=None, blocked_ids=[]):
        self.G = nx.Graph()
        self.blocked_ids = set(blocked_ids) # Faster lookup

        # A. Build the Graph (Custom or Random)
        if custom_data:
            self._load_custom_graph(custom_data)
        else:
            self._generate_random_graph(num_nodes)

        # B. Calculate Influence & Assign Categories (Titan, Mega, etc.)
        # We do this for BOTH custom and random graphs so the GNN has features.
        self._calculate_node_features()

        # C. Initialize GNN Model
        # Input Features: 3 (Trust, Influence, State) -> Output: 1 (Probability)
        self.model = GCN(in_channels=3, out_channels=1)
        self.model.eval()

    def _load_custom_graph(self, data):
        """Builds graph from user uploaded JSON."""
        # 1. Add Nodes (Filter out blocked ones)
        for node in data.nodes:
            if node.id not in self.blocked_ids:
                # Use provided trust or default random
                trust_val = getattr(node, 'trust', np.random.uniform(0.1, 0.9))
                self.G.add_node(node.id, trust=trust_val, state=0)
        
        # 2. Add Edges
        for link in data.links:
            if link.source not in self.blocked_ids and link.target not in self.blocked_ids:
                # Ensure nodes exist before adding edge (networkx handles this, but good practice)
                if self.G.has_node(link.source) and self.G.has_node(link.target):
                    self.G.add_edge(link.source, link.target)

    def _generate_random_graph(self, num_nodes):
        """Generates scale-free graph (Your original logic + blocking)."""
        temp_G = nx.barabasi_albert_graph(num_nodes, 2)
        
        # Transfer nodes/edges to self.G, skipping blocked ones
        # We assume IDs are integers 0..N for random graphs
        for i in range(num_nodes):
            # Check if this ID is blocked (convert to string if needed)
            if str(i) not in self.blocked_ids and f"User-{i}" not in self.blocked_ids:
                self.G.add_node(i, trust=np.random.uniform(0.1, 0.9), state=0)
        
        for u, v in temp_G.edges():
            if self.G.has_node(u) and self.G.has_node(v):
                self.G.add_edge(u, v)

    def _calculate_node_features(self):
        """Calculates Influence tiers (Titan, Mega...) for GNN features."""
        if self.G.number_of_nodes() == 0: return

        degrees = dict(self.G.degree())
        max_degree = max(degrees.values()) if degrees else 1
        
        for i in self.G.nodes():
            deg = degrees.get(i, 0)
            norm_inf = deg / max_degree 
            
            # 5-Class System (Your original logic)
            if norm_inf > 0.8:   cat, name = "Titan", f"Titan-{i}"
            elif norm_inf > 0.6: cat, name = "Mega", f"Mega-{i}"
            elif norm_inf > 0.4: cat, name = "Macro", f"Macro-{i}"
            elif norm_inf > 0.2: cat, name = "Micro", f"Micro-{i}"
            else:                cat, name = "Nano", f"User-{i}"

            # Set Attributes required for GNN
            self.G.nodes[i]['influence'] = norm_inf
            self.G.nodes[i]['influence_cat'] = cat 
            self.G.nodes[i]['name'] = name # This name is sent to frontend
            
            # Ensure 'trust' and 'state' exist (if missing from custom data)
            if 'trust' not in self.G.nodes[i]:
                self.G.nodes[i]['trust'] = 0.5
            if 'state' not in self.G.nodes[i]:
                self.G.nodes[i]['state'] = 0

    def get_pyg_data(self):
        """Converts NetworkX graph to PyTorch Geometric Data."""
        # Convert node labels to integers 0..N for PyG
        # (This is crucial if custom data has string IDs like "Alice", "Bob")
        mapping = {node: i for i, node in enumerate(self.G.nodes())}
        H = nx.relabel_nodes(self.G, mapping)

        features = []
        # Sort by new integer ID to align with adjacency matrix
        for i in range(len(H)):
            n = H.nodes[i]
            # Feature Vector: [Trust, Influence, Is_Infected]
            features.append([n['trust'], n['influence'], n['state']])
        
        data = from_networkx(H)
        data.x = torch.tensor(features, dtype=torch.float)
        
        # Handle case with isolated nodes (no edges)
        if data.edge_index is None: 
            data.edge_index = torch.empty((2, 0), dtype=torch.long)
            
        return data

    def predict_spread_probabilities(self):
        """Runs the GNN to get infection probability for every node."""
        if self.G.number_of_nodes() == 0:
            return []
            
        data = self.get_pyg_data()
        with torch.no_grad(): 
            output = self.model(data)
        
        # Returns a numpy array of probabilities [0.1, 0.9, 0.4...]
        return output.numpy().flatten()