# MKH Debtors & Solutions - Full Stack

A production-ready automated communication platform built for a South African debt recovery firm. This system streamlines client interactions via a WhatsApp chatbot and provides a React-based monitoring dashboard for business operations.

---

## 🔗 Project Links
- **Official Website:** [mkhdebtors.co.za](https://mkhdebtors.co.za/)  
- **Direct WhatsApp Access:** [wa.me/27600192890](https://wa.me/27600192890?text=Hi%20MKH%20Debtors)  
  *Try the bot live! Send "Hi" to trigger the automated service menu.*

---

## 🏗️ System Architecture & Logic

This project demonstrates a robust "Webhook-First" architecture. Instead of just sending messages, the bot handles stateful conversations and business logic.

### 🧩 The Backend (Node.js & Express)
The backend acts as a **Controller** in the MVC pattern, handling incoming webhooks from Meta/Twilio.
- **State Management:** Tracks where a user is in the "Service Menu" (e.g., waiting for an ID number vs. selecting a car app).
- **Security:** Implements Twilio Signature Verification to ensure incoming requests are authentic.
- **Scalability:** Designed to handle asynchronous document processing for South African credit reports.

### 🎨 The Frontend (React + Vite)
A minimalist management console for the internal MKH team.
- **Real-time Monitoring:** Built with Vite for instant HMR (Hot Module Replacement).
- **Service Dashboard:** Visualizes debtor interaction data and document request statuses.
- **Tech Highlights:** Tailwind CSS for responsive design and Lucide-React for intuitive iconography.

---

## 🛠️ Tech Stack & Skills Demonstrated

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS, Axios |
| **Backend** | Node.js, Express, REST APIs |
| **Communications** | Twilio WhatsApp Business API |
| **Compliance** | RICA (South Africa) Regulatory Integration |
| **Tooling** | Git/GitHub, Postman, Ngrok |

---

## 🤖 Bot Capabilities & Service Logic

The MKH Debtors Bot is engineered to handle high-frequency South African credit and debt inquiries. It uses a state-driven menu system to provide 24/7 automated assistance.

### 🛠️ Core Services Handled
Users can navigate through the following automated service flows:

* **🚫 Debt Review Removal:** Guided intake for clients looking to clear debt review flags from their credit profiles (Form 19 process).
* **⚖️ Judgement Rescission:** Automated collection of case details for legal removal of court judgements.
* **🚗 Car Application Support:** Specialized triage for clients needing credit clearance specifically to qualify for vehicle finance.
* **📑 Prescription Letters:** Generates requests to expunge debts that are legally "prescribed" (older than 3 years without acknowledgement).
* **💳 Credit Report Clearance:** Step-by-step assistance in disputing defaults and outdated adverse listings with bureaus like Experian and TransUnion.
* **🤝 Settlement Negotiations:** Facilitates the request for "Paid-Up Letters" and discounted settlement figures from creditors.

### ⚙️ Technical Features
- **Intelligent Triage:** Uses Keyword and Button-based navigation to route users to the correct legal department.
- **Data Capture:** Securely collects South African ID numbers and reference codes for file retrieval.
- **Document Dispatch:** (In Progress) Integration to send PDF clearance certificates and settlement letters directly via WhatsApp.
- **Human Escalation:** Seamless "Talk to Agent" trigger that notifies the MKH team via the React Dashboard.

---

### 🔄 Interactive Menu Structure
The bot utilizes Meta’s **List Messages** and **Quick Reply Buttons** to ensure a high conversion rate:
1.  **Greeting:** Identifies the user and presents the "Main Menu."
2.  **Selection:** User picks a service (e.g., "Judgement Removal").
3.  **Intake:** Bot asks for necessary documents or ID info.
4.  **Confirmation:** Bot provides a reference number and sets expectations for human follow-up.

## 📱 Bot Workflow Features
- **Automated Triage:** Instantly categorizes user needs (Paid Up Letters, Car Apps, Judgement Rescissions).
- **Document Collection:** Intelligent flow to gather required user data (ID numbers, Reference codes).
- **24/7 Availability:** Provides debtors with instant responses outside of standard business hours.

---

## 🛡️ Professional Development Practices
- **Clean Code:** Adheres to modular folder structures separating routes, controllers, and services.
- **Regulatory Compliance:** Successfully navigated the **RICA** (Regulation of Interception of Communications Act) process for South African mobile integration.
- **Git Flow:** Maintains a clean commit history demonstrating an iterative development process.

---


- **Developer:** Makhubele Langavi
- **Portfolio:** [Langavi's Portfolio](https://langavi-portfolio.vercel.app/)
