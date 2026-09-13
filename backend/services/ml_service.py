"""
ML Service for Sentia AI.
Loads persisted TF-IDF vectorizer and Logistic Regression model from models/
Provides single and batch sentiment inference, probability distributions,
and feature importance explainability.
"""

import os
import re
import json
import os
import re
import json
import joblib
import numpy as np
from backend.services.sentence_analyzer import SentenceCompositionAnalyzer

class MLService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(MLService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, models_dir=None):
        if self._initialized:
            return
        
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        if models_dir is None:
            models_dir = os.path.join(base_dir, "models")

        self.model_path = os.path.join(models_dir, "sentiment_model.pkl")
        self.vectorizer_path = os.path.join(models_dir, "tfidf_vectorizer.pkl")
        self.metadata_path = os.path.join(models_dir, "model_metadata.json")

        print(f"[MLService] Loading model from {self.model_path}...")
        if not os.path.exists(self.model_path) or not os.path.exists(self.vectorizer_path):
            raise FileNotFoundError(f"Model or vectorizer file missing in {models_dir}")

        self.model = joblib.load(self.model_path)
        self.vectorizer = joblib.load(self.vectorizer_path)
        self.classes = list(self.model.classes_)
        
        # Load metadata if exists
        self.metadata = {}
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

        self.feature_names = self.vectorizer.get_feature_names_out()
        self.sentence_analyzer = SentenceCompositionAnalyzer()
        self._initialized = True
        print(f"[MLService] Initialized successfully with SentenceCompositionAnalyzer. Classes: {self.classes}")

    @staticmethod
    def clean_text(text):
        if not isinstance(text, str):
            return ""
        text = text.lower()
        text = re.sub(r"http\S+|www\S+", " ", text)
        text = re.sub(r"\S+@\S+", " ", text)
        text = re.sub(r"<.*?>", " ", text)
        text = re.sub(r"@\w+", " ", text)
        text = re.sub(r"#", "", text)
        text = re.sub(r"[\r\n\t]", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def predict(self, raw_text):
        if not raw_text or not raw_text.strip():
            raise ValueError("Input text cannot be empty.")

        cleaned = self.clean_text(raw_text)
        if not cleaned:
            return {
                "raw_text": raw_text,
                "clean_text": "",
                "sentiment": "Neutral",
                "confidence": 0.3333,
                "probabilities": {c: round(1.0 / len(self.classes), 4) for c in self.classes},
                "tokens": [],
                "key_features": [],
                "sentence_analysis": {
                    "compound_score": 0.0,
                    "structural_explanation": "Empty text provided.",
                    "dominant_clause": "",
                    "clauses": [],
                    "negations": []
                }
            }

        # 1. Full-Sentence Compositional Analysis (negation, contrastive pivots, idioms)
        sent_res = self.sentence_analyzer.analyze_full_sentence(raw_text)
        sent_probs = sent_res["probabilities"]

        # 2. Statistical ML Model (TF-IDF + Logistic Regression)
        vec = self.vectorizer.transform([cleaned])
        raw_ml_probs = self.model.predict_proba(vec)[0]
        ml_probs_dict = {
            self.classes[i]: float(raw_ml_probs[i])
            for i in range(len(self.classes))
        }

        # 3. Dynamic Compositional Blending
        # Determine whether strong sentence structure or compositional indicators are present
        has_negation = len(sent_res.get("negations", [])) > 0
        has_contrast = len(sent_res.get("clauses", [])) > 1
        has_special = len(sent_res.get("special_matches", [])) > 0
        compound = abs(sent_res.get("compound_score", 0.0))
        strong_sentiment = compound >= 0.35
        moderate_sentiment = compound >= 0.20

        if has_negation or has_special or strong_sentiment:
            # Clear syntactic structure or strong signal: sentence analyzer dominates
            w_sent = 0.78
            w_ml = 0.22
        elif has_contrast or moderate_sentiment:
            # Moderate structural cue: balanced lean toward sentence analyzer
            w_sent = 0.65
            w_ml = 0.35
        else:
            # Weak/no structural signal: trust the trained statistical model more
            w_sent = 0.45
            w_ml = 0.55

        blended = {}
        for c in self.classes:
            s_p = sent_probs.get(c, 0.3333)
            m_p = ml_probs_dict.get(c, 0.3333)
            blended[c] = (w_sent * s_p) + (w_ml * m_p)

        # Normalize probabilities sum to 1.0
        total_b = sum(blended.values())
        if total_b > 0:
            for c in blended:
                blended[c] = blended[c] / total_b

        # Pick winner
        best_class = max(blended.keys(), key=lambda k: blended[k])
        confidence = blended[best_class]

        # 4. Feature weights explainability
        feature_weights = []

        # Add syntactic/compositional explanation features first
        for neg in sent_res.get("negations", []):
            feature_weights.append({
                "term": f"{neg['negator']} {neg['target']} [negation flipped]",
                "score": 3.0 if neg["shifted_to"] == "Positive" else -3.0
            })

        for sm in sent_res.get("special_matches", []):
            feature_weights.append({
                "term": f"{sm['matched']} [{sm['description']}]",
                "score": round(sm["score"], 2)
            })

        for feat in sent_res.get("features", []):
            feature_weights.append({
                "term": feat["phrase"],
                "score": feat["delta"]
            })

        # Add active TF-IDF features
        pred_idx = self.classes.index(best_class)
        feature_indices = vec.nonzero()[1]
        class_coefs = self.model.coef_[pred_idx]

        for fi in feature_indices:
            name = self.feature_names[fi]
            weight = float(class_coefs[fi])
            # Avoid duplicating terms already in feature_weights
            if not any(fw["term"].lower() == name.lower() for fw in feature_weights):
                feature_weights.append({
                    "term": name,
                    "score": round(weight, 4)
                })

        feature_weights.sort(key=lambda x: abs(x["score"]), reverse=True)

        return {
            "raw_text": raw_text,
            "clean_text": cleaned,
            "sentiment": best_class,
            "confidence": round(float(confidence), 4),
            "probabilities": {c: round(float(blended[c]), 4) for c in self.classes},
            "tokens": cleaned.split(),
            "key_features": feature_weights[:8],
            "compound_score": sent_res.get("compound_score", 0.0),
            "sentence_analysis": {
                "compound_score": sent_res.get("compound_score", 0.0),
                "structural_explanation": sent_res.get("structural_explanation", ""),
                "dominant_clause": sent_res.get("dominant_clause", ""),
                "clauses": sent_res.get("clauses", []),
                "negations": sent_res.get("negations", []),
                "special_matches": sent_res.get("special_matches", [])
            }
        }

    def predict_batch(self, texts):
        results = []
        if not texts:
            return results

        for original in texts:
            try:
                res = self.predict(str(original))
                results.append({
                    "text": str(original),
                    "clean_text": res["clean_text"],
                    "sentiment": res["sentiment"],
                    "confidence": res["confidence"],
                    "probabilities": res["probabilities"],
                    "compound_score": res.get("compound_score", 0.0),
                    "structural_explanation": res.get("sentence_analysis", {}).get("structural_explanation", "")
                })
            except Exception:
                results.append({
                    "text": str(original),
                    "clean_text": "",
                    "sentiment": "Neutral",
                    "confidence": 0.3333,
                    "probabilities": {c: round(1.0 / len(self.classes), 4) for c in self.classes},
                    "compound_score": 0.0,
                    "structural_explanation": "Error during sentence processing"
                })

        return results

    def get_metadata(self):
        return self.metadata

