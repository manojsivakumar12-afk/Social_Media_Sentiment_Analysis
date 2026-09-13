"""
History Service for Sentia AI.
Manages user single & bulk analysis prediction logs with local JSON persistence.
Supports querying, adding, deleting, and clearing historical entries.
"""

import os
import json
import time
from datetime import datetime

class HistoryService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(HistoryService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, history_file=None):
        if self._initialized:
            return

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if history_file is None:
            history_file = os.path.join(base_dir, "history.json")

        self.history_file = history_file
        self.history = []
        self._load()
        self._initialized = True

    def _load(self):
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, "r", encoding="utf-8") as f:
                    self.history = json.load(f)
            except Exception as e:
                print(f"[HistoryService] Error loading history: {e}")
                self.history = []
        else:
            # Seed initial realistic examples if completely empty
            self.history = [
                {
                    "id": "hist_001",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "text": "The new update has made our team collaboration so much faster and seamless! Absolute game changer.",
                    "sentiment": "Positive",
                    "confidence": 0.9421,
                    "platform": "Twitter",
                    "probabilities": {"Positive": 0.9421, "Neutral": 0.0412, "Negative": 0.0167}
                },
                {
                    "id": "hist_002",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "text": "Constant disconnects and zero support response for over 48 hours. Completely unacceptable service.",
                    "sentiment": "Negative",
                    "confidence": 0.9634,
                    "platform": "Reddit",
                    "probabilities": {"Negative": 0.9634, "Neutral": 0.0245, "Positive": 0.0121}
                },
                {
                    "id": "hist_003",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "text": "Attending the annual developer summit tomorrow at 10 AM in hall B.",
                    "sentiment": "Neutral",
                    "confidence": 0.8876,
                    "platform": "LinkedIn",
                    "probabilities": {"Neutral": 0.8876, "Positive": 0.0612, "Negative": 0.0512}
                }
            ]
            self._save()

    def _save(self):
        try:
            with open(self.history_file, "w", encoding="utf-8") as f:
                json.dump(self.history, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[HistoryService] Error saving history: {e}")

    def add_entry(self, text, sentiment, confidence, probabilities=None, platform="Direct Input", tags=None):
        entry_id = f"hist_{int(time.time() * 1000)}"
        entry = {
            "id": entry_id,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "text": text,
            "sentiment": sentiment,
            "confidence": round(confidence, 4),
            "platform": platform,
            "probabilities": probabilities or {},
            "tags": tags or []
        }
        self.history.insert(0, entry)  # Prepend newest
        # Cap at 500 entries to prevent runaway memory
        if len(self.history) > 500:
            self.history = self.history[:500]
        self._save()
        return entry

    def add_batch_entries(self, items):
        entries = []
        for item in items:
            entry_id = f"hist_{int(time.time() * 1000)}_{len(entries)}"
            entry = {
                "id": entry_id,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "text": item.get("text", ""),
                "sentiment": item.get("sentiment", "Neutral"),
                "confidence": round(item.get("confidence", 0.0), 4),
                "platform": item.get("platform", "Batch Upload"),
                "probabilities": item.get("probabilities", {})
            }
            entries.append(entry)

        # Prepend
        self.history = entries + self.history
        if len(self.history) > 500:
            self.history = self.history[:500]
        self._save()
        return len(entries)

    def get_entries(self, search="", sentiment="", limit=100):
        results = self.history
        if sentiment and sentiment.lower() != "all":
            results = [r for r in results if r["sentiment"].lower() == sentiment.lower()]
        if search:
            q = search.lower()
            results = [r for r in results if q in r["text"].lower() or q in r.get("platform", "").lower()]
        return results[:limit]

    def delete_entry(self, entry_id):
        initial_len = len(self.history)
        self.history = [r for r in self.history if r["id"] != entry_id]
        if len(self.history) != initial_len:
            self._save()
            return True
        return False

    def clear_all(self):
        self.history = []
        self._save()
        return True
