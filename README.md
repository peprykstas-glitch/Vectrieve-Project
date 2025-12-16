# 🧠 CoreMind AI

**CoreMind** is a secure, hybrid RAG (Retrieval-Augmented Generation) system designed for high-precision document analysis. It combines local data privacy with cloud-based inference speed.

## 🚀 Key Features
* **Hybrid Architecture:** Local Vector DB (Qdrant) + Cloud Inference (Groq LPU).
* **Sub-Second Latency:** Query processing in <1s (reduced from 30s+).
* **No Hallucinations:** Uses strict RAG pipeline with source citation.
* **Enterprise Ready:** Dockerized environment with `docker-compose`.
* **Privacy First:** Documents are chunked locally; full text is never exposed to public APIs.

## 🛠️ Tech Stack
* **Core:** Python 3.10+, FastAPI
* **AI Engine:** Llama 3.3 70B (via Groq)
* **Database:** Qdrant (Vector Store)
* **Frontend:** Streamlit
* **DevOps:** Docker, Docker Compose, Ngrok

## 📦 Installation & Setup
2.  **Set up Environment:**
    Create a `.env` file and add your API keys:
    ```env
    GROQ_API_KEY=your_key_here
    ```

3.  **Run with One Click (Windows):**
    Double-click `start_coremind.bat` on your desktop.

    *Or manual launch:*
    ```bash
    docker-compose up -d
    python backend/main.py
    streamlit run frontend/main.py
    ```

## 📸 Screenshots
*(soon)*

## 📄 License
MIT License.