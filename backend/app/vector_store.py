import uuid
from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.exceptions import UnexpectedResponse
from fastembed import TextEmbedding
from app.config import settings

class VectorStore:
    def __init__(self):
        print("🔌 Connecting to Qdrant...")
        self.client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        self.collection_name = settings.COLLECTION_NAME
        
        print("🚀 Loading FastEmbed (High-Speed Local Embeddings)...")
        # bge-small-en-v1.5 забезпечує найкращу точність для пошуку по коду та документах
        self.model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        
        self._ensure_collection_exists()

    def _ensure_collection_exists(self):
        try:
            self.client.get_collection(self.collection_name)
        except Exception:
            print(f"🔨 Creating collection '{self.collection_name}'...")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=384, 
                    distance=models.Distance.COSINE
                )
            )

    def add_document(self, text: str, meta: dict = None):
        """Додає документ до бази"""
        doc_id = str(uuid.uuid4())
        vector = list(self.model.embed([text]))[0].tolist()

        payload = {"content": text}
        if meta: payload.update(meta)

        self.client.upsert(
            collection_name=self.collection_name,
            points=[models.PointStruct(id=doc_id, vector=vector, payload=payload)]
        )
        return doc_id

    def search(self, query: str, limit: int = 3):
        """Адекватний пошук: повертає контекст тільки якщо він дійсно є"""
        try:
            # 1. Перевірка: чи є в базі взагалі хоч один файл?
            collection_info = self.client.get_collection(self.collection_name)
            if collection_info.points_count == 0:
                return [] # База порожня — повертаємо пустий список, щоб ШІ не вигадував дурниць

            # 2. Генерація вектора запиту
            query_vector = list(self.model.embed([query]))[0].tolist()

            # 3. Пошук з використанням query_points (найсучасніший метод)
            # score_threshold=0.5 — відсікає нерелевантний "шум", щоб не було галюцинацій
            results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=limit,
                score_threshold=0.5 
            ).points

            # Якщо результати є, але вони дуже слабкі (не схожі на запит) — ігноруємо їх
            return results

        except Exception as e:
            # Якщо метод query_points не підтримується, спробуємо старий search
            try:
                query_vector = list(self.model.embed([query]))[0].tolist()
                return self.client.search(
                    collection_name=self.collection_name,
                    query_vector=query_vector,
                    limit=limit
                )
            except Exception as e2:
                print(f"ℹ️ Search skipped: {e2}")
                return []

vector_db = VectorStore()