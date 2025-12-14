from fpdf import FPDF
import datetime

class PDFReport(FPDF):
    def header(self):
        # Logo or Title
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'SCFCE - Social Content Flow Control Engine', 0, 1, 'C')
        self.set_font('Arial', 'I', 10)
        self.cell(0, 10, 'Advanced Social Threat Simulation Report', 0, 1, 'C')
        self.line(10, 30, 200, 30)
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

    def chapter_title(self, title):
        self.set_font('Arial', 'B', 12)
        self.set_fill_color(200, 220, 255)
        self.cell(0, 10, title, 0, 1, 'L', 1)
        self.ln(4)

    def chapter_body(self, body):
        self.set_font('Arial', '', 11)
        self.multi_cell(0, 10, body)
        self.ln()

def generate_pdf(simulation_data, config):
    pdf = PDFReport()
    pdf.add_page()

    # --- 1. OVERALL RISK ASSESSMENT ---
    pdf.chapter_title("1. Risk Assessment")
    risk_score = simulation_data['metadata'].get('calculated_risk', 0)
    
    risk_text = f"Analyzed Content: \"{config.content_text}\"\n"
    risk_text += f"Neural Risk Score: {risk_score} / 1.0\n"
    
    if risk_score > 0.7:
        risk_text += "VERDICT: HIGH THREAT DETECTED. Immediate mitigation recommended."
    elif risk_score > 0.4:
        risk_text += "VERDICT: MODERATE RISK. Monitoring advised."
    else:
        risk_text += "VERDICT: LOW RISK. Content appears benign."
        
    pdf.chapter_body(risk_text)

    # --- 2. NETWORK TOPOLOGY ---
    pdf.chapter_title("2. Network Topology Status")
    
    last_step = simulation_data['results'][-1]
    total_nodes = config.num_nodes
    infected = last_step['total_reach']
    saturation = (infected / total_nodes) * 100
    
    topo_text = f"Total Nodes in Network: {total_nodes}\n"
    topo_text += f"Seed Nodes (Patient Zero): {config.seed_nodes}\n"
    topo_text += f"Defense Strategy: {config.strategy.replace('_', ' ').title()}\n"
    topo_text += f"Final Saturation: {saturation:.2f}%\n"
    topo_text += f"Blocked/Banned Nodes: {len(config.blocked_node_ids)}"
    
    pdf.chapter_body(topo_text)

    # --- 3. TOP INFLUENCERS (THE TABLE) ---
    pdf.chapter_title("3. Top 5 Super-Spreaders (Critical Nodes)")
    
    # Table Header
    pdf.set_font('Arial', 'B', 10)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(20, 10, 'Rank', 1, 0, 'C', 1)
    pdf.cell(80, 10, 'Node ID (User)', 1, 0, 'C', 1)
    pdf.cell(50, 10, 'Infections Caused', 1, 1, 'C', 1) # '1' at end means new line

    # Table Rows
    pdf.set_font('Arial', '', 10)
    top_5 = last_step['live_top_5']
    
    for i, node in enumerate(top_5):
        pdf.cell(20, 10, str(i + 1), 1, 0, 'C')
        pdf.cell(80, 10, node['id'], 1, 0, 'C')
        pdf.cell(50, 10, str(node['count']), 1, 1, 'C')

    pdf.ln(10)
    pdf.set_font('Arial', 'I', 10)
    pdf.cell(0, 10, f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 0, 1, 'R')

    return pdf