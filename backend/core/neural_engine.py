from transformers import pipeline
import logging

# Suppress heavy TensorFlow/PyTorch logs
logging.getLogger("transformers").setLevel(logging.ERROR)

class NeuralRiskAnalyzer:
    def __init__(self):
        print(" [NEURAL] Loading Transformer Model... (This happens once)")
        # We use a 'Zero-Shot Classification' pipeline.
        # It allows us to classify text into arbitrary categories without training.
        # 'facebook/bart-large-mnli' is a standard, powerful model for this.
     # valhalla/distilbart-mnli-12-1 is much smaller (~300MB)
        self.classifier = pipeline("zero-shot-classification", model="valhalla/distilbart-mnli-12-1")
        print(" [NEURAL] Model Loaded Successfully.")

    def calculate_risk(self, text):
        """
        Uses a Neural Network to determine if the text is a scam/risk.
        Returns a float between 0.0 (Safe) and 1.0 (High Risk).
        """
        # Define the categories we want the NN to look for
        candidate_labels = ["crypto scam", "urgent financial threat", "suspicious link", "neutral conversation", "safe news"]
        
        # Run the classification
        result = self.classifier(text, candidate_labels)
        
        # Extract scores
        labels = result['labels']
        scores = result['scores']
        
        # Create a mapping of Label -> Score
        score_map = {label: score for label, score in zip(labels, scores)}
        
        # Calculate weighted risk
        # If the NN thinks it's a "scam" or "threat", risk goes up.
        scam_score = score_map.get("crypto scam", 0)
        threat_score = score_map.get("urgent financial threat", 0)
        suspicious_score = score_map.get("suspicious link", 0)
        
        # Max risk detected among negative categories
        risk_level = max(scam_score, threat_score, suspicious_score)
        
        return round(risk_level, 2)

# Simple test if run directly
if __name__ == "__main__":
    analyzer = NeuralRiskAnalyzer()
    print(analyzer.calculate_risk("Urgent! Send 1000 ETH to this wallet instantly to win!"))