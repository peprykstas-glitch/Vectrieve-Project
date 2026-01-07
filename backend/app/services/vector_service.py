import uuid
from qdrant_client import QdrantClient
from qdrant_client.http import models
from fastembed import TextEmbedding
from app.core.config import settings  # <-- Оновлений імпорт

class VectorService:
    def __init__(self):
        print("🔌 Connecting to Qdrant...")
        self.client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        self.collection_name = settings.COLLECTION_NAME
        
        print("🚀 Loading FastEmbed...")
        self.model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        self._ensure_collection_exists()

    def _ensure_collection_exists(self):
        try:
            self.client.get_collection(self.collection_name)
        except Exception:
            print(f"🔨 Creating collection '{self.collection_name}'...")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE)
            )

    def add_document(self, text: str, meta: dict = None):
        doc_id = str(uuid.uuid4())
        # FastEmbed повертає генератор, тому беремо list()[0]
        vector = list(self.model.embed([text]))[0].tolist()

        payload = {"content": text}
        if meta: payload.update(meta)

        self.client.upsert(
            collection_name=self.collection_name,
            points=[models.PointStruct(id=doc_id, vector=vector, payload=payload)]
        )
        return doc_id

    def search(self, query: str, limit: int = 3):
        try:
            collection_info = self.client.get_collection(self.collection_name)
            if collection_info.points_count == 0:
                return []

            query_vector = list(self.model.embed([query]))[0].tolist()
            
            results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=limit,
                score_threshold=0.4  # Трохи знизив поріг для кращого пошуку
            ).points
            return results
        except Exception as e:
            print(f"⚠️ Vector Search Error: {e}")
            return []

vector_service = VectorService()