import random
import networkx as nx
from .graph_engine import SocialGraph
from .ga_optimizer import GeneticOptimizer

# --- IMPORT AI ENGINES ---
from .neural_engine import NeuralRiskAnalyzer  # Transformer (Text)
from .gnn_engine import GNNEngine              # Graph Neural Network (Topology)

class SimulationEngine:
    def __init__(self, config):
        self.config = config
        
        # --- 1. INITIALIZE GRAPH WITH CUSTOM DATA & BLOCKING ---
        # This is the critical update you needed
        self.graph = SocialGraph(
            num_nodes=config.num_nodes,          # Slider Value
            custom_data=config.custom_graph,     # Uploaded JSON
            blocked_ids=config.blocked_node_ids  # Clicked/Blocked Nodes
        )
        
        self.ga = GeneticOptimizer()
        
        # 2. Initialize Text AI (Transformer)
        self.neural_text = NeuralRiskAnalyzer()
        
        # 3. Initialize Graph AI (GNN)
        # Note: We must use the ACTUAL graph size (which might differ from config if custom data was uploaded)
        self.gnn = GNNEngine(num_nodes=self.graph.G.number_of_nodes())

        # 4. Analyze Content Risk (Runs Once)
        print(f" [SIM] Analyzing content: '{config.content_text}'")
        self.calculated_risk = self.neural_text.calculate_risk(config.content_text)
        print(f" [SIM] Neural Risk Score: {self.calculated_risk}")

        # 5. Setup Simulation Data
        self.display_names = {}
        self._generate_display_names()
        self.transmission_counts = {} 

        # 6. Genetic Optimization (Optional)
        self.ga_params = None
        if config.strategy == 'genetic_optimized':
            print(" [SIM] Running Genetic Optimization...")
            self.ga_params = self.ga.run_optimization()

    def _generate_display_names(self):
        """Creates a mapping from ID (int) -> Name (str) based on influence."""
        G = self.graph.G
        degrees = dict(G.degree())
        
        # Sort nodes by influence (highest connections first)
        sorted_nodes = sorted(degrees, key=degrees.get, reverse=True)
        total = len(sorted_nodes)
        
        titan_limit = int(total * 0.02)
        macro_limit = int(total * 0.12)
        
        for i, node_id in enumerate(sorted_nodes):
            # If custom data provided specific names, use them. Otherwise generate Titan/User names.
            if 'name' in G.nodes[node_id]:
                self.display_names[node_id] = G.nodes[node_id]['name']
            else:
                if i < titan_limit:
                    name = f"Titan-{node_id}"
                elif i < macro_limit:
                    name = f"Macro-{node_id}"
                else:
                    name = f"User-{node_id}"
                self.display_names[node_id] = name

    def get_display_name(self, node_id):
        return self.display_names.get(node_id, f"Node-{node_id}")

    def step(self, timestep):
        new_activations = []
        new_paths = [] 
        
        # --- AI STEP: GNN PREDICTION ---
        # The GNN analyzes the entire graph structure + current infection state
        # to predict the probability of every single node getting infected.
        gnn_probs = self.gnn.predict_new_infections(self.graph, self.calculated_risk)
        
        # Get currently infected nodes
        active_nodes = [n for n, d in self.graph.G.nodes(data=True) if d['state'] == 1]
        
        for active_node in active_nodes:
            neighbors = list(self.graph.G.neighbors(active_node))
            
            for neighbor in neighbors:
                # If neighbor is not yet infected
                if self.graph.G.nodes[neighbor]['state'] == 0:
                    
                    # 1. Get Probability from GNN
                    # Handle varying graph sizes safely (in case of dynamic custom data)
                    # gnn_probs is a DICT now thanks to the gnn_engine update
                    gnn_prob = float(gnn_probs.get(neighbor, 0.1))
                    
                    # 2. Calculate Final Probability
                    # We combine the GNN's structural prediction with the Text Risk
                    final_prob = (gnn_prob * 0.8) + (self.calculated_risk * 0.2)
                    
                    # 3. Apply Genetic Optimization (Defense Strategy)
                    if self.ga_params:
                         final_prob /= self.ga_params['optimized_suppression']

                    # 4. Attempt Infection
                    if random.random() < final_prob:
                        if neighbor not in new_activations:
                            new_activations.append(neighbor)
                            
                            # Record Path
                            src_name = self.get_display_name(active_node)
                            tgt_name = self.get_display_name(neighbor)
                            new_paths.append([src_name, tgt_name]) 
                            
                            # Update Leaderboard
                            if src_name not in self.transmission_counts:
                                self.transmission_counts[src_name] = 0
                            self.transmission_counts[src_name] += 1

        # Update Graph State
        for n in new_activations:
            self.graph.G.nodes[n]['state'] = 1
            
        # Calculate Live Top 5
        sorted_influencers = sorted(
            self.transmission_counts.items(), 
            key=lambda item: item[1], 
            reverse=True
        )[:5]
        
        live_top_5_data = [{"id": k, "count": v} for k, v in sorted_influencers]

        return {
            "timestep": timestep,
            "active_spreaders": len(active_nodes) + len(new_activations),
            "total_reach": len(active_nodes) + len(new_activations),
            "newly_activated": [self.get_display_name(n) for n in new_activations],
            "activation_paths": new_paths,
            "live_top_5": live_top_5_data
        }

    def run(self):
        # Initialize seed nodes
        all_nodes = list(self.graph.G.nodes())
        
        # If custom graph is smaller than requested seeds, cap it to prevent crash
        num_seeds = min(self.config.seed_nodes, len(all_nodes))
        
        if num_seeds > 0:
            seeds = random.sample(all_nodes, num_seeds)
            for s in seeds:
                self.graph.G.nodes[s]['state'] = 1
            
        history = []
        for t in range(self.config.simulation_steps):
            step_data = self.step(t)
            history.append(step_data)
            
        return history