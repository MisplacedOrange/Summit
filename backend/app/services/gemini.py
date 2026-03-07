from __future__ import annotations

import hashlib
from typing import Any

import httpx

from app.config import settings


class GeminiService:
    def __init__(self) -> None:
        self.embed_model = "models/text-embedding-004"
        self.generate_model = "gemini-1.5-flash"

    async def generate(self, prompt: str) -> str:
        if not settings.GEMINI_API_KEY:
            return ""

        endpoint = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.generate_model}:generateContent?key={settings.GEMINI_API_KEY}"
        )
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(endpoint, json=payload)
            response.raise_for_status()
            data = response.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError):
            return ""

    async def embed(self, text: str) -> list[float]:
        if settings.GEMINI_API_KEY:
            endpoint = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"
            payload: dict[str, Any] = {
                "model": self.embed_model,
                "content": {"parts": [{"text": text}]},
                "taskType": "SEMANTIC_SIMILARITY",
            }
            params = {"key": settings.GEMINI_API_KEY}
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(endpoint, params=params, json=payload)
                response.raise_for_status()
                data = response.json()
            embedding = data.get("embedding", {}).get("values", [])
            if isinstance(embedding, list) and len(embedding) == 768:
                return [float(v) for v in embedding]

        # Deterministic fallback embedding for local/test environments.
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        seed_values = list(digest) * 24
        return [float(v) / 255.0 for v in seed_values[:768]]


gemini_service = GeminiService()
