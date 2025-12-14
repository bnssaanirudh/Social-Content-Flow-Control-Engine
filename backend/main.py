from fastapi import FastAPI, Depends, WebSocket, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
import networkx as nx
from fastapi.responses import StreamingResponse
from core.report_generator import generate_pdf 
from typing import Dict, Any # Import the new helper
import io

# --- FIXED IMPORTS BELOW ---
# 1. Logic comes from auth.py
from core.auth import create_access_token, get_current_user, fake_users_db, verify_password

# 2. Data Models come from data_schemas.py
from models.data_schemas import SimulationConfig, SimulationResponse, Token, UserLogin

# 3. Simulator engine
from core.simulator import SimulationEngine
# ---------------------------

app = FastAPI(title="SCFCE Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = fake_users_db.get(form_data.username)
    if not user or not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user['username']})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/simulate", response_model=SimulationResponse)
def run_simulation(config: SimulationConfig, current_user: dict = Depends(get_current_user)):
    
    engine = SimulationEngine(config)
    results = engine.run()
    
    # Convert graph for Frontend
    graph_data = nx.node_link_data(engine.graph.G)
    
    return {
        "metadata": {
            "calculated_risk": engine.calculated_risk,
            "strategy_used": config.strategy,
            "ga_params": engine.ga_params
        },
        "results": results,
        "graph_topology": graph_data
    }

@app.websocket("/ws/live-feed")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("Connected to SCFCE Live Stream")
    await websocket.close()

@app.post("/generate_pdf_report")
def generate_pdf_report(request_data: Dict[str, Any]):
    # Extract data from the request body
    results = request_data.get('results')
    config_dict = request_data.get('config')
    
    # Reconstruct config object (simple version)
    from models.data_schemas import SimulationConfig
    config = SimulationConfig(**config_dict)

    # Generate PDF
    pdf = generate_pdf(results, config)
    
    # Output to byte stream
    pdf_buffer = io.BytesIO()
    pdf_output = pdf.output(dest='S').encode('latin-1') # 'S' returns as string
    pdf_buffer.write(pdf_output)
    pdf_buffer.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="SCFCE_Threat_Report.pdf"'
    }
    
    return StreamingResponse(pdf_buffer, headers=headers, media_type='application/pdf')