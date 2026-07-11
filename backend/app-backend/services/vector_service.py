import uuid
import logging
from typing import List, Optional
import asyncio
from pydantic import BaseModel
from core.config import settings

logger = logging.getLogger(__name__)


class SearchResult(BaseModel):
    text: str
    filename: str
    score: float

    def __getitem__(self, item):
        return getattr(self, item)

    def get(self, item, default=None):
        return getattr(self, item, default)


class VectorService:
    def __init__(self):
        from qdrant_client import QdrantClient
        from ollama import Client

        logger.info("🔌 Connecting to Qdrant...")
        
        self.local_client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        logger.info("🏠 Local Qdrant connected.")

        self.cloud_client = None
        if settings.QDRANT_URL and settings.QDRANT_API_KEY:
            self.cloud_client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
            logger.info("☁️ Cloud Qdrant connected.")
        else:
            logger.warning("⚠️ Cloud Qdrant not configured in .env")
        
        self.collection_name = settings.COLLECTION_NAME + "_nomic"

        logger.info("🚀 Compiling Ollama Embedding Client...")
        self.ollama_client = Client(host=settings.OLLAMA_BASE_URL)
        # Verify the embedding model exists
        models = [m.model for m in self.ollama_client.list().models]
        if not any('nomic-embed-text' in m for m in models):
            try:
                logger.info("⏳ Downloading nomic-embed-text model. This might take a minute...")
                self.ollama_client.pull('nomic-embed-text')
            except Exception as e:
                logger.warning(f"⚠️ Failed to pull embedding model: {e}")
                
        self.embed_model = "nomic-embed-text"
        
        # Test embedding to get dimension
        test_embed = self._embed_text("test")
        if not test_embed:
            raise RuntimeError("Failed to generate test embedding with Ollama.")
            
        self.vector_size = len(test_embed)
        self._ensure_collection_exists(self.local_client)
        if self.cloud_client:
            try:
                self._ensure_collection_exists(self.cloud_client)
            except Exception as e:
                logger.warning(f"⚠️ Failed to connect to Qdrant Cloud client: {e}. Falling back to local client only.")
                self.cloud_client = None

        self.reranker = None

    def _get_reranker(self):
        """Lazy-load ONNX TextCrossEncoder for high-performance reranking."""
        if self.reranker is None and settings.RERANK_ENABLED:
            try:
                logger.info(f"🚀 Loading Fastembed Reranker model: '{settings.RERANKER_MODEL_NAME}'...")
                from fastembed.rerank.cross_encoder.text_cross_encoder import TextCrossEncoder
                self.reranker = TextCrossEncoder(model_name=settings.RERANKER_MODEL_NAME)
                logger.info("✅ Fastembed Reranker loaded successfully.")
            except Exception as e:
                logger.error(f"⚠️ Failed to initialize Fastembed Reranker: {e}")
        return self.reranker

    def _embed_text(self, text: str) -> List[float]:
        """Helper to generate a single embedding using Ollama."""
        response = self.ollama_client.embeddings(model=self.embed_model, prompt=text)
        return response['embedding']

    def _ensure_collection_exists(self, client):
        from qdrant_client.http import models

        try:
            client.get_collection(self.collection_name)
        except Exception:
            logger.info(f"🔨 Creating collection '{self.collection_name}' with size {self.vector_size}...")
            client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=self.vector_size, distance=models.Distance.COSINE
                ),
            )

    async def upsert_batch(self, texts: List[str], filename: str, user_id: int):
        """
        Batch upsert with parallel embedding generation.

        Bug 2 fix: instead of generating embeddings one-by-one (200 serial Ollama
        calls for a 200-chunk document), we split texts into batches of EMBED_BATCH_SIZE
        and scatter them as concurrent asyncio.to_thread tasks. This reduces total
        embedding time from O(n) sequential to O(n/batch) parallel.

        Architectural Note / Future-Proofing:
        If migrating to a cloud embedding provider (like OpenAI or Cohere) or a dedicated
        local service (like TEI - Text Embeddings Inference), those APIs natively support
        batch text arrays in a single HTTP request (e.g. client.embed([text1, text2, ...])).
        Using native API batches is significantly faster than parallel asynchronous requests
        because it saves network request overhead and benefits from hardware batching.
        """
        from qdrant_client.http import models
        if not texts:
            return

        logger.info(f"📄 Embedding {len(texts)} chunks from '{filename}' in parallel batches...")

        EMBED_BATCH_SIZE = 8  # tune based on Ollama server capacity

        def _embed_batch(batch: List[str]) -> List[List[float]]:
            """Embed a slice of texts synchronously — runs in a thread."""
            return [self._embed_text(t) for t in batch]

        # Split texts into batches, scatter as concurrent thread tasks
        batches = [texts[i:i + EMBED_BATCH_SIZE] for i in range(0, len(texts), EMBED_BATCH_SIZE)]
        batch_results = await asyncio.gather(
            *[asyncio.to_thread(_embed_batch, batch) for batch in batches]
        )
        # Flatten results back to a flat list in original order
        all_embeddings: List[List[float]] = [vec for batch in batch_results for vec in batch]

        points = []
        for text, vector in zip(texts, all_embeddings):
            if not vector or len(vector) != self.vector_size:
                logger.warning(f"⚠️ Warning: Skipping invalid vector of size {len(vector) if vector else 0} for text chunk")
                continue

            doc_id = str(uuid.uuid4())
            payload = {"text": text, "filename": filename, "user_id": user_id}
            points.append(
                models.PointStruct(id=doc_id, vector=vector, payload=payload)
            )

        if not points:
            logger.warning("⚠️ No valid vectors to upsert.")
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
        logger.info(f"✅ Upserted {len(points)} vectors to Qdrant (local and cloud).")

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
        logger.info(f"🗑️ Deleted vectors for file: {filename} of user: {user_id}")

    async def search(self, query: str, user_id: int, limit: int = 5, mode: str = "local", filenames: Optional[List[str]] = None) -> List[SearchResult]:
        try:
            # Handle empty query strings safely
            if not query or not query.strip():
                query = "document summary overview details content key points"

            # 1. Dense (Vector) Search — cast a wider net for diversity
            query_vector = await asyncio.to_thread(self._embed_text, query)
            client_to_use = self.cloud_client if (mode == "cloud" and self.cloud_client) else self.local_client
            
            from qdrant_client.http import models
            must_conditions = [
                models.FieldCondition(
                    key="user_id",
                    match=models.MatchValue(value=user_id),
                )
            ]
            if filenames:
                must_conditions.append(
                    models.FieldCondition(
                        key="filename",
                        match=models.MatchAny(any=filenames),
                    )
                )

            query_filter = models.Filter(must=must_conditions)

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
                logger.warning(f"⚠️ Qdrant dense search failed: {ex}")

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
                        )
                        if filenames:
                            stmt = stmt.where(Document.filename.in_(filenames))
                        stmt = (
                            stmt.where(text("to_tsvector('english', documentchunk.content) @@ plainto_tsquery('english', :query_val)"))
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
                        )
                        if filenames:
                            stmt = stmt.where(Document.filename.in_(filenames))
                        stmt = stmt.limit(dense_limit)
                        
                    res = await session.execute(stmt)
                    for db_chunk, db_doc in res.all():
                        sparse_results.append({
                            "text": db_chunk.content,
                            "filename": db_doc.filename,
                        })
            except Exception as ex:
                logger.warning(f"⚠️ SQL sparse full-text search failed: {ex}")

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

            # 3.5. Cross-Encoder Reranking
            reranker = self._get_reranker()
            if reranker and sorted_texts:
                try:
                    candidates_to_rerank = sorted_texts[:15]
                    logger.info(f"🧠 Reranking {len(candidates_to_rerank)} candidates with Cross-Encoder...")
                    
                    def _run_rerank():
                        return list(reranker.rerank(query=query, documents=candidates_to_rerank))
                    
                    scores = await asyncio.to_thread(_run_rerank)
                    
                    # Associate scores
                    reranked_items = []
                    for text, score in zip(candidates_to_rerank, scores):
                        reranked_items.append((text, float(score)))
                    
                    # Sort reranked items by cross-encoder score descending
                    reranked_items.sort(key=lambda x: x[1], reverse=True)
                    
                    # Min-Max scale scores to [0.1, 1.0] for safe relevance threshold calculation
                    if reranked_items:
                        min_s = min(item[1] for item in reranked_items)
                        max_s = max(item[1] for item in reranked_items)
                        diff = max_s - min_s
                        for text, score in reranked_items:
                            norm_score = (score - min_s) / diff if diff > 0 else 1.0
                            # Keep it in a positive scale [0.1, 1.0]
                            scaled_score = 0.1 + norm_score * 0.9
                            # Override RRF score for these top candidates
                            rrf_scores[text] = scaled_score
                    
                    # Reconstruct sorted_texts with reranked items first, followed by remaining RRF items
                    sorted_texts = [item[0] for item in reranked_items] + sorted_texts[15:]
                except Exception as rerank_err:
                    logger.warning(f"⚠️ Reranking failed (falling back to pure RRF): {rerank_err}")

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
            logger.info(f"🔍 Hybrid Search merged {len(dense_results)} dense + {len(sparse_results)} sparse → {len(merged_results)} results from {unique_files} unique files.")
            return [SearchResult(text=r["text"], filename=r["filename"], score=r["score"]) for r in merged_results]

        except Exception as e:
            logger.error(f"⚠️ Hybrid Search Error: {e}")
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
            logger.warning(f"⚠️ VectorService unavailable (Qdrant not running?): {e}")
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