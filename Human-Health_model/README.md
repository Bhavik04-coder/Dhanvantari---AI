# Human Health Model — FastAPI Backend

Disease prediction API using a Deep Residual Neural Network + RAG-powered medical chat.

## Stack
- **FastAPI** — REST API
- **PyTorch** — Deep Residual Network (86.76% accuracy, 87.95% F1, 631 diseases)
- **Ollama + llama3.2** — Free-form medical Q&A
- **TF-IDF RAG** — Retrieval from 4 medical CSV datasets (description, diet, precautions, workout)
- **scikit-learn** — TF-IDF vectorizer for RAG retrieval

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/predict` | Predict disease from symptoms |
| POST | `/chat` | RAG + LLM medical chat |
| GET | `/health` | Health check |

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Install Ollama + llama3.2
Download Ollama from https://ollama.com and run:
```bash
ollama pull llama3.2
```

### 3. Model artifacts
The following files are **not tracked in git** due to size (>100MB).
You must obtain them separately and place them in `models/`:

| File | Size | Required |
|------|------|----------|
| `disease_resnet.pt` | ~54MB | ✅ Yes |
| `final_ensemble.joblib` | ~2.7GB | Optional |
| `randomforest_graph.joblib` | ~2.7GB | Optional |
| `linearsvc_onehot.joblib` | ~7MB | Optional |

The following small artifacts **are tracked** in git:
- `models/feature_names.joblib`
- `models/label_encoder.joblib`
- `models/idf.joblib`
- `models/symptom_embeddings.joblib`
- `models/word2vec_embeddings.joblib`
- `models/results_summary.json`
- `models/training_history.json`

To retrain the model from scratch:
```bash
python train_nn.py
```

### 4. RAG datasets
The 4 CSV datasets are in `../RAG/dataset/` (relative to this folder):
- `description.csv`
- `diets.csv`
- `precautions_df.csv`
- `workout_df.csv`

### 5. Start the server
```bash
python -m uvicorn app:app --port 8000 --reload
```

API runs at `http://localhost:8000`

## Chat API example

```json
POST /chat
{
  "message": "what precautions should I take?",
  "history": [],
  "context": {
    "disease": "Psoriasis",
    "confidence": 95,
    "symptoms": ["Skin Rash", "Joint Pain"]
  }
}
```

The `context` field is optional — without it the chat answers general medical questions.
