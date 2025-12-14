import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl

class FuzzyController:
    def __init__(self):
        # 1. Inputs (Antecedents)
        self.risk = ctrl.Antecedent(np.arange(0, 1.1, 0.1), 'risk')
        self.trust = ctrl.Antecedent(np.arange(0, 1.1, 0.1), 'trust')
        
        # 2. Output (Consequent)
        # 1.0 = Boost content, 0.0 = Block content
        self.amp_factor = ctrl.Consequent(np.arange(0, 1.1, 0.1), 'amp_factor')

        # 3. Membership Functions (The "Fuzzy" definitions)
        self.risk.automf(3)  # poor(low), average, good(high)
        self.trust.automf(3) # poor, average, good
        
        # Custom output shapes
        self.amp_factor['suppress'] = fuzz.trimf(self.amp_factor.universe, [0, 0, 0.5])
        self.amp_factor['neutral'] = fuzz.trimf(self.amp_factor.universe, [0.2, 0.5, 0.8])
        self.amp_factor['boost'] = fuzz.trimf(self.amp_factor.universe, [0.5, 1, 1])

        # 4. Rules Base
        # Note: In automf, 'good' usually means high value (High Risk).
        # Rule: High Risk AND Low Trust -> SUPPRESS
        rule1 = ctrl.Rule(self.risk['good'] & self.trust['poor'], self.amp_factor['suppress'])
        
        # Rule: Low Risk AND High Trust -> BOOST
        rule2 = ctrl.Rule(self.risk['poor'] & self.trust['good'], self.amp_factor['boost'])
        
        # Rule: Average Risk -> NEUTRAL
        rule3 = ctrl.Rule(self.risk['average'], self.amp_factor['neutral'])
        
        # Rule: High Risk BUT High Trust -> NEUTRAL (Trusted source sharing risky news)
        rule4 = ctrl.Rule(self.risk['good'] & self.trust['good'], self.amp_factor['neutral'])

        self.ctrl_system = ctrl.ControlSystem([rule1, rule2, rule3, rule4])
        self.simulator = ctrl.ControlSystemSimulation(self.ctrl_system)

    def compute_amplification(self, risk_val, trust_val):
        self.simulator.input['risk'] = risk_val
        self.simulator.input['trust'] = trust_val
        
        try:
            self.simulator.compute()
            return self.simulator.output['amp_factor']
        except:
            # Fallback if edge cases fail
            return 0.5