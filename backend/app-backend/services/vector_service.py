import uuid
from typing import List, Optional
import asyncio
from core.config import settings


class VectorService:
    def __init__(self):
        from qdrant_client import QdrantClient
        from ollama import Client

        print("🔌 Connecting to Qdrant...")
        
        self.local_client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        print("🏠 Local Qdrant connected.")

        self.cloud_client = None
        if settings.QDRANT_URL and settings.QDRANT_API_KEY:
            self.cloud_client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
            print("☁️ Cloud Qdrant connected.")
        else:
            print("⚠️ Cloud Qdrant not configured in .env")
        
        self.collection_name = settings.COLLECTION_NAME + "_nomic"

        print("🚀 Compiling Ollama Embedding Client...")
        self.ollama_client = Client(host=settings.OLLAMA_BASE_URL)
        # Verify the embedding model exists
        models = [m.model for m in self.ollama_client.list().models]
        if not any('nomic-embed-text' in m for m in models):
            try:
                print("⏳ Downloading nomic-embed-text model. This might take a minute...")
                self.ollama_client.pull('nomic-embed-text')
            except Exception as e:
                print(f"⚠️ Failed to pull embedding model: {e}")
                
        self.embed_model = "nomic-embed-text"
        
        # Test embedding to get dimension
        test_embed = self._embed_text("test")
        if not test_embed:
            raise RuntimeError("Failed to generate test embedding with Ollama.")
            
        self.vector_size = len(test_embed)
        self._ensure_collection_exists(self.local_client)
        if self.cloud_client:
            self._ensure_collection_exists(self.cloud_client)

    def _embed_text(self, text: str) -> List[float]:
        """Helper to generate a single embedding using Ollama."""
        response = self.ollama_client.embeddings(model=self.embed_model, prompt=text)
        return response['embedding']

    def _ensure_collection_exists(self, client):
        from qdrant_client.http import models

        try:
            client.get_collection(self.collection_name)
        except Exception:
            print(f"🔨 Creating collection '{self.collection_name}' with size {self.vector_size}...")
            client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=self.vector_size, distance=models.Distance.COSINE
                ),
            )

    async def upsert_batch(self, texts: List[str], filename: str, user_id: int):
        """Batch upsert utilizing threads for Ollama calls so async loop isn't blocked."""
        from qdrant_client.http import models
        if not texts:
            return

        print(f"📄 Embedding {len(texts)} chunks from {filename}...")

        # Function to run embeddings synchronously in thread
        def _embed_all():
            vectors = []
            for t in texts:
                vectors.append(self._embed_text(t))
            return vectors

        embeddings = await asyncio.to_thread(_embed_all)

        points = []
        for text, vector in zip(texts, embeddings):
            if not vector or len(vector) != self.vector_size:
                print(f"⚠️ Warning: Skipping invalid vector of size {len(vector) if vector else 0} for text chunk")
                continue
                
            doc_id = str(uuid.uuid4())
            payload = {"text": text, "filename": filename, "user_id": user_id}
            points.append(
                models.PointStruct(id=doc_id, vector=vector, payload=payload)
            )

        if not points:
            print("⚠️ No valid vectors to upsert.")
            return

        self.local_client.upsert(
            collection_name=self.collection_name,
            points=points,
            wait=True,
        )
        if self.cloud_client:
            self.cloud_client.upsert(
                collection_name=self.collection_name,
                points=points,
                wait=True,
            )
        print(f"✅ Upserted {len(points)} vectors to Qdrant (local and cloud).")

    def delete_file(self, filename: str, user_id: int):
        from qdrant_client.http import models

        selector = models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="filename",
                        match=models.MatchValue(value=filename),
                    ),
                    models.FieldCondition(
                        key="user_id",
                        match=models.MatchValue(value=user_id),
                    )
                ]
            )
        )
        
        self.local_client.delete(
            collection_name=self.collection_name,
            points_selector=selector,
            wait=True,
        )
        if self.cloud_client:
            self.cloud_client.delete(
                collection_name=self.collection_name,
                points_selector=selector,
                wait=True,
            )
        print(f"🗑️ Deleted vectors for file: {filename} of user: {user_id}")

    async def search(self, query: str, user_id: int, limit: int = 5, mode: str = "local") -> List[dict]:
        try:
            # 1. Dense (Vector) Search — cast a wider net for diversity
            query_vector = await asyncio.to_thread(self._embed_text, query)
            client_to_use = self.cloud_client if (mode == "cloud" and self.cloud_client) else self.local_client
            
            from qdrant_client.http import models
            query_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="user_id",
                        match=models.MatchValue(value=user_id),
                    )
                ]
            )

            dense_limit = limit * 3  # Retrieve more candidates for diversity reranking

            dense_results = []
            try:
                dense_results = client_to_use.query_points(
                    collection_name=self.collection_name,
                    query=query_vector,
                    query_filter=query_filter,
                    limit=dense_limit,
                ).points
            except Exception as ex:
                print(f"⚠️ Qdrant dense search failed: {ex}")

            # 2. Sparse (Keyword) Search in PostgreSQL/SQLite (Full-Text Search)
            sparse_results = []
            try:
                from core.database import get_session_factory
                from sqlmodel import select
                from models.document import DocumentChunk, Document
                from sqlalchemy import or_

                session_factory = get_session_factory()
                async with session_factory() as session:
                    bind = session.bind
                    is_postgres = (bind.dialect.name == "postgresql") if bind else False
                    
                    if is_postgres:
                        from sqlalchemy import text
                        stmt = (
                            select(DocumentChunk, Document)
                            .join(Document, DocumentChunk.document_id == Document.id)
                            .where(DocumentChunk.user_id == user_id)
                            .where(DocumentChunk.chunk_index >= 0)  # Exclude AI summary chunk
                            .where(text("to_tsvector('english', documentchunk.content) @@ plainto_tsquery('english', :query_val)"))
                            .params(query_val=query)
                            .limit(dense_limit)
                        )
                    else:
                        # Fallback for SQLite
                        words = [w.strip() for w in query.split() if len(w.strip()) > 2]
                        if not words:
                            words = [query]
                        conditions = [DocumentChunk.content.ilike(f"%{w}%") for w in words]
                        stmt = (
                            select(DocumentChunk, Document)
                            .join(Document, DocumentChunk.document_id == Document.id)
                            .where(DocumentChunk.user_id == user_id)
                            .where(DocumentChunk.chunk_index >= 0)  # Exclude AI summary chunk
                            .where(or_(*conditions))
                            .limit(dense_limit)
                        )
                        
                    res = await session.execute(stmt)
                    for db_chunk, db_doc in res.all():
                        sparse_results.append({
                            "text": db_chunk.content,
                            "filename": db_doc.filename,
                        })
            except Exception as ex:
                print(f"⚠️ SQL sparse full-text search failed: {ex}")

            # 3. Reciprocal Rank Fusion (RRF) Merging
            # RRF Score = sum( 1 / (60 + rank) )
            rrf_scores = {}
            text_to_item = {}

            # Score dense results
            for rank, hit in enumerate(dense_results):
                text = hit.payload.get("text", "")
                filename = hit.payload.get("filename", "")
                if not text:
                    continue
                score = 1.0 / (60.0 + rank + 1)
                rrf_scores[text] = rrf_scores.get(text, 0.0) + score
                text_to_item[text] = {"text": text, "filename": filename}

            # Score sparse results
            for rank, hit in enumerate(sparse_results):
                text = hit["text"]
                filename = hit["filename"]
                score = 1.0 / (60.0 + rank + 1)
                rrf_scores[text] = rrf_scores.get(text, 0.0) + score
                text_to_item[text] = {"text": text, "filename": filename}

            # Sort by RRF score descending
            sorted_texts = sorted(rrf_scores.keys(), key=lambda t: rrf_scores[t], reverse=True)

            # 4. Source Diversity Reranking
            # Guarantee at least one chunk from each unique file before filling by score.
            # This prevents a single large document from monopolizing all result slots.
            all_candidates = []
            for text in sorted_texts:
                all_candidates.append({
                    "text": text,
                    "filename": text_to_item[text]["filename"],
                    "score": rrf_scores[text] * 30.0,
                })

            merged_results = []
            seen_files = set()
            used_texts = set()

            # Relevance gate: only diversify files whose best chunk scores
            # at least 30% of the top candidate's score. This prevents
            # completely irrelevant files from being force-included.
            top_score = all_candidates[0]["score"] if all_candidates else 0
            relevance_threshold = top_score * 0.30

            # Pass 1: Pick the top-scoring chunk from each unique RELEVANT file
            for candidate in all_candidates:
                if len(merged_results) >= limit:
                    break
                fn = candidate["filename"]
                if fn not in seen_files and candidate["score"] >= relevance_threshold:
                    seen_files.add(fn)
                    used_texts.add(candidate["text"])
                    merged_results.append(candidate)

            # Pass 2: Fill remaining slots by pure RRF score (any file)
            for candidate in all_candidates:
                if len(merged_results) >= limit:
                    break
                if candidate["text"] not in used_texts:
                    used_texts.add(candidate["text"])
                    merged_results.append(candidate)

            unique_files = len(set(r["filename"] for r in merged_results))
            print(f"🔍 Hybrid Search merged {len(dense_results)} dense + {len(sparse_results)} sparse → {len(merged_results)} results from {unique_files} unique files.")
            return merged_results

        except Exception as e:
            print(f"⚠️ Hybrid Search Error: {e}")
            return []


# --- Lazy singleton ---
_vector_service: Optional[VectorService] = None
_vector_init_failed = False


def get_vector_service() -> Optional[VectorService]:
    """Lazy-initialize VectorService. Returns None if Qdrant is unavailable."""
    global _vector_service, _vector_init_failed
    if _vector_init_failed:
        return None
    if _vector_service is None:
        try:
            _vector_service = VectorService()
        except Exception as e:
            _vector_init_failed = True
            print(f"⚠️ VectorService unavailable (Qdrant not running?): {e}")
            return None
    return _vector_service


class _LazyVectorProxy:
    """Proxy that lazily initializes VectorService on first attribute access."""

    def __getattr__(self, name):
        svc = get_vector_service()
        if svc is None:
            raise RuntimeError(
                "VectorService is not available. Is Qdrant running?"
            )
        return getattr(svc, name)

vector_service = _LazyVectorProxy()