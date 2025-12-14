import torch
import torch.nn as nn
import networkx as nx
import numpy as np

class SimpleGCNLayer(nn.Module):
    def __init__(self, in_features, out_features):
        super(SimpleGCNLayer, self).__init__()
        self.linear = nn.Linear(in_features, out_features)

    def forward(self, A, X):
        # A = Adjacency (Connections), X = Features
        support = self.linear(X)
        output = torch.matmul(A, support)
        return output

class GNNModel(nn.Module):
    def __init__(self, input_dim, hidden_dim):
        super(GNNModel, self).__init__()
        self.gc1 = SimpleGCNLayer(input_dim, hidden_dim)
        self.gc2 = SimpleGCNLayer(hidden_dim, 1) # Output: 1 probability score
        self.relu = nn.ReLU()
        self.sigmoid = nn.Sigmoid()

    def forward(self, A, X):
        x = self.relu(self.gc1(A, X))
        x = self.sigmoid(self.gc2(A, x))
        return x

class GNNEngine:
    def __init__(self, num_nodes):
        self.num_nodes = num_nodes
        # 3 Input Features: [Is_Infected, Trust_Score, Content_Risk]
        self.model = GNNModel(input_dim=3, hidden_dim=16)
        self.model.eval()

    def predict_new_infections(self, graph_obj, content_risk):
        """
        Runs GNN to predict infection probability.
        Returns a DICTIONARY: { 'Node_ID': probability }
        """
        G = graph_obj.G
        
        # 1. Create a Mapping (String ID -> Integer Index)
        # This solves the KeyError by converting "Titan-0" to index 0, etc.
        nodes_list = list(G.nodes())
        node_to_idx = {node_id: i for i, node_id in enumerate(nodes_list)}
        
        num_current_nodes = len(nodes_list)
        if num_current_nodes == 0:
            return {}

        # 2. Build Adjacency Matrix (A)
        # We use the mapping to place connections in the correct matrix slots
        A = np.eye(num_current_nodes) # Start with identity (self-loops)
        
        for u, v in G.edges():
            if u in node_to_idx and v in node_to_idx:
                i, j = node_to_idx[u], node_to_idx[v]
                A[i, j] = 1.0
                A[j, i] = 1.0
                
        A_tensor = torch.FloatTensor(A)

        # 3. Build Feature Matrix (X)
        # We iterate over the LIST of nodes to ensure order matches the mapping
        features = []
        for node_id in nodes_list:
            node_data = G.nodes[node_id]
            
            # Safe access to attributes with defaults
            state = float(node_data.get('state', 0))
            trust = float(node_data.get('trust', 0.5))
            
            features.append([state, trust, content_risk])
        
        X_tensor = torch.FloatTensor(features)

        # 4. Run GNN Forward Pass
        with torch.no_grad():
            probs_tensor = self.model(A_tensor, X_tensor)
        
        probs_flat = probs_tensor.flatten().numpy()
        
        # 5. Map Probabilities back to String IDs
        # Return Dict: { "User-1": 0.85, "Titan-0": 0.12, ... }
        result_map = {node_id: float(probs_flat[i]) for i, node_id in enumerate(nodes_list)}
        
        return result_map