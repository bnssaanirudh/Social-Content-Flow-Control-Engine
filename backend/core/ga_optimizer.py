import pygad
import numpy as np

class GeneticOptimizer:
    """
    Optimizes the fuzzy control parameters (e.g. thresholds) 
    to minimize harmful spread while maintaining engagement.
    """
    def __init__(self):
        # Genes: [Risk_Weight, Trust_Weight, Suppression_Strength]
        self.gene_space = [{'low': 0.1, 'high': 1.0}, 
                           {'low': 0.1, 'high': 1.0}, 
                           {'low': 0.5, 'high': 2.0}] 

    def fitness_func(self, ga_instance, solution, solution_idx):
        # This function simulates a 'micro-simulation' to test the genes.
        # Goal: Maximize (Safe_Reach) - (Harmful_Reach * Penalty)
        
        # For this codebase, we simulate a simple math model for speed
        risk_weight, trust_weight, suppression = solution
        
        # Mock results based on gene values
        # If suppression is too high, engagement (fitness) drops
        # If risk_weight is too low, harmful spread (penalty) increases
        
        engagement_score = 100 / (suppression + 0.1)
        safety_score = risk_weight * 50
        
        fitness = engagement_score + safety_score
        return fitness

    def run_optimization(self):
        ga_instance = pygad.GA(num_generations=5,
                               num_parents_mating=2,
                               fitness_func=self.fitness_func,
                               sol_per_pop=5,
                               num_genes=3,
                               gene_space=self.gene_space,
                               suppress_warnings=True)
        
        ga_instance.run()
        solution, solution_fitness, _ = ga_instance.best_solution()
        
        return {
            "optimized_risk_weight": solution[0],
            "optimized_trust_weight": solution[1],
            "optimized_suppression": solution[2]
        }