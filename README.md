# 🛡️ Social Content Flow Control Engine (SCFCE)

**SCFCE** is an enterprise-grade simulation platform designed to analyze, visualize, and mitigate the spread of harmful content (misinformation, scams, viral threats) across complex social networks.

It leverages a unique **Multi-AI Architecture** to provide realistic propagation modeling and adaptive defense strategies.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Python](https://img.shields.io/badge/Backend-FastAPI%20%7C%20PyTorch-blue)
![React](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-cyan)

---

## 🚀 Key Technologies

* **🧠 Neural Networks (NLP):** Uses **Transformer models (BART-Large)** for Zero-Shot Classification to calculate real-time Risk Scores based on message semantics.
* **🕸️ Graph Neural Networks (GNN):** Implements a **PyTorch-based Graph Convolutional Network (GCN)** to predict infection probabilities based on network topology and node trust levels.
* **🧬 Genetic Algorithms:** Evolves defense parameters over multiple generations to find the optimal strategy for suppressing viral spread without blocking legitimate traffic.
* **⚖️ Fuzzy Logic Controller:** Models the uncertainty of human behavior and trust dynamics to simulate realistic node-to-node transmission.

## ✨ Features

* **Live Topology Visualization:** Interactive, physics-based graph rendering (Force-Directed Graph) showing real-time infection spread using **D3.js** logic.
* **Custom Network Uploads:** Support for uploading custom JSON datasets to simulate specific organizational structures or social circles.
* **Interactive Mitigation:** "Click-to-Block" functionality allows admins to simulate node bans and firewalls in real-time.
* **Enterprise Reporting:** Generates detailed **PDF reports** with risk assessments, impact curves, and identification of critical "Super-Spreader" nodes.

## 🛠️ Installation & Setup

### Prerequisites
* Python 3.8+
* Node.js & npm

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\Activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload
