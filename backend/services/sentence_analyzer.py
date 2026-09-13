"""
Sentence Composition Analyzer for Sentia AI.
Provides deep sentence-level semantic understanding beyond single-word TF-IDF.
Handles:
1. Discourse connectives & clause contrast ('but', 'however', 'although', 'yet')
2. Syntactic negation scope & valence flipping ('not good' -> negative, 'not bad' -> positive)
3. Intensifiers and diminishers ('extremely', 'barely')
4. Modal / counterfactual structures ('thought it would be X but was Y', 'could have been better')
5. Social media emojis and slang
6. Clause-by-clause sentiment trajectory
"""

import re
from typing import Dict, List, Any, Tuple

# Positive sentiment lexicon with weights (1.0 to 4.0)
POSITIVE_LEXICON = {
    # Core emotions & evaluations
    "good": 1.5, "great": 2.5, "excellent": 3.2, "amazing": 3.2, "wonderful": 3.0,
    "fantastic": 3.2, "awesome": 3.0, "superb": 3.2, "brilliant": 3.0, "outstanding": 3.5,
    "love": 3.0, "loving": 2.8, "loved": 2.8, "loves": 2.8, "adore": 3.0, "adored": 3.0,
    "best": 3.2, "better": 1.6, "decent": 1.4, "solid": 1.4, "nice": 1.4, "fine": 1.0,
    "happy": 2.2, "glad": 1.8, "pleased": 2.0, "delighted": 2.8, "joy": 2.5, "joyful": 2.5,
    "perfect": 3.5, "flawless": 3.5, "phenomenal": 3.5, "exceptional": 3.5, "masterpiece": 3.8,
    "impressive": 2.5, "impressed": 2.5, "recommend": 2.2, "recommended": 2.2,
    "hope": 1.8, "hopeful": 2.0, "satisfying": 2.2, "satisfied": 2.2, "satisfaction": 2.2,
    "helpful": 1.8, "smooth": 1.6, "clean": 1.4, "worth": 2.0, "worthy": 1.8,
    "favorite": 2.8, "gem": 2.8, "cool": 1.6, "fun": 1.8, "easy": 1.4,
    "thriving": 2.5, "growth": 1.6, "success": 2.5, "successful": 2.5, "win": 2.4, "winner": 2.4,
    "safe": 1.5, "effective": 2.0, "reliable": 2.0, "excited": 2.4, "exciting": 2.4,
    "comfort": 1.8, "comfortable": 1.8, "inspiring": 2.5, "inspired": 2.5,
    "beautiful": 2.5, "gorgeous": 2.8, "pretty": 1.4, "stunning": 3.0, "genius": 3.0,
    "fire": 2.5, "slaps": 2.5, "goat": 3.5, "based": 2.0, "legendary": 3.0,
    # Extended positive coverage
    "charm": 2.0, "charming": 2.2, "delight": 2.5, "delightful": 2.5,
    "fabulous": 3.0, "magnificent": 3.2, "marvelous": 3.0, "splendid": 2.8,
    "superstar": 3.0, "top": 2.2, "elite": 2.5, "premium": 2.0, "quality": 2.0,
    "works": 1.4, "works great": 2.8, "love it": 3.0, "perfect": 3.5,
    "refreshing": 2.0, "seamless": 2.2, "intuitive": 2.0, "innovative": 2.2,
    "fast": 1.6, "quick": 1.5, "responsive": 1.8, "stable": 1.8, "polished": 2.0,
    "appreciated": 2.0, "value": 1.8, "affordable": 1.8, "exceeded": 2.5,
    "exceeded expectations": 3.0, "surpassed": 2.5, "flawlessly": 3.0,
    "upgrade": 1.6, "improved": 2.0, "improvement": 2.0,
    # Emojis
    "❤️": 2.5, "💖": 2.5, "💕": 2.2, "😍": 3.0, "🥰": 2.8, "😊": 2.0, "😃": 2.0,
    "😄": 2.0, "😁": 2.0, "👍": 2.0, "👏": 2.2, "🙌": 2.2, "💯": 2.5, "🚀": 2.5,
    "🎉": 2.5, "✨": 2.0, "🌟": 2.2, "🔥": 2.5, "👌": 2.0, "🏆": 3.0, "⭐": 2.0,
    "💪": 2.0, "😎": 2.0, "🤩": 3.0, "😻": 3.0
}

# Negative sentiment lexicon with weights (1.0 to 4.0)
NEGATIVE_LEXICON = {
    # Core emotions & evaluations
    "hate": 3.5, "hated": 3.5, "hates": 3.5, "hating": 3.2,
    "terrible": 3.5, "awful": 3.5, "horrible": 3.5, "horrific": 3.8, "disgusting": 3.8,
    "bad": 2.0, "worse": 2.8, "worst": 3.8, "poor": 2.0, "poorer": 2.2, "poorest": 3.0,
    "garbage": 3.5, "trash": 3.5, "junk": 2.8, "crap": 3.0, "shitty": 3.5, "shit": 3.5,
    "disappointment": 3.2, "disappointed": 3.2, "disappointing": 3.2,
    "ruin": 3.0, "ruined": 3.5, "ruins": 3.0, "ruining": 3.2,
    "frustrated": 2.5, "frustrating": 2.5, "frustration": 2.5,
    "annoyed": 2.2, "annoying": 2.2, "irritated": 2.2, "irritating": 2.2,
    "angry": 2.8, "furious": 3.5, "rage": 3.2, "mad": 2.0,
    "stressed": 2.2, "stress": 2.0, "overwhelmed": 2.2, "anxious": 2.0, "depressed": 2.8,
    "useless": 3.0, "worthless": 3.5, "waste": 3.0, "wasted": 3.0, "pathetic": 3.5,
    "failure": 3.2, "failed": 3.0, "fails": 2.8, "failing": 2.8,
    "broken": 2.6, "crashes": 3.0, "crashed": 3.0, "crashing": 3.0, "crash": 2.8,
    "buggy": 2.4, "bugs": 2.0, "glitchy": 2.2, "glitches": 2.0,
    "slow": 1.6, "sluggish": 2.0, "expensive": 1.5, "overpriced": 2.4,
    "scam": 4.0, "fraud": 4.0, "fake": 3.0, "cheat": 3.5, "cheated": 3.5,
    "ugly": 2.4, "mess": 2.5, "messy": 2.4, "nightmare": 3.5, "disaster": 3.5,
    "sucks": 3.2, "suck": 3.0, "sucked": 3.0, "sucking": 2.8,
    "painful": 2.8, "suffering": 3.0, "suffer": 2.8, "sad": 2.2, "unhappy": 2.4,
    "boring": 2.0, "dull": 1.8, "flawed": 2.2, "flaws": 2.0, "problem": 1.8, "problems": 2.0,
    "regret": 2.8, "regretted": 2.8, "regretful": 2.8, "avoid": 2.2,
    # Extended negative coverage
    "unacceptable": 3.2, "uninstalled": 2.8, "refund": 2.5, "broken down": 3.0,
    "unreliable": 2.8, "unstable": 2.6, "lags": 2.2, "lagging": 2.2, "laggy": 2.2,
    "overheating": 2.5, "overheat": 2.5, "defective": 3.0, "defect": 2.8,
    "malfunction": 3.0, "malfunctioning": 3.0, "error": 2.0, "errors": 2.2,
    "unusable": 3.2, "unresponsive": 2.8, "freeze": 2.5, "frozen": 2.6, "freezing": 2.6,
    "misleading": 2.8, "deceptive": 3.2, "lied": 3.0, "lies": 2.8, "dishonest": 3.0,
    "ridiculous": 2.6, "absurd": 2.4, "unbelievable": 2.2, "shocking": 2.2,
    "disgusted": 3.5, "outraged": 3.5, "infuriated": 3.5,
    "mediocre": 2.0, "subpar": 2.4, "lacking": 2.0, "insufficient": 2.0,
    "never again": 3.5, "stay away": 3.2, "waste of": 3.2,
    # Emojis
    "😡": 3.5, "😠": 3.0, "🤬": 4.0, "🤮": 3.8, "🤢": 3.2, "💔": 3.2,
    "👎": 2.8, "😭": 2.5, "😢": 2.2, "😞": 2.5, "😔": 2.2, "💩": 3.0,
    "🗑️": 3.0, "🤡": 2.5, "💀": 2.0, "🤦": 2.5, "🙄": 1.8
}

# Negation words that invert or shift subsequent token valence
NEGATION_WORDS = {
    "not", "never", "no", "hardly", "barely", "scarcely", "rarely", "seldom",
    "cannot", "cant", "can't", "dont", "don't", "doesnt", "doesn't", "didnt", "didn't",
    "wont", "won't", "wouldnt", "wouldn't", "shouldnt", "shouldn't", "couldnt", "couldn't",
    "isnt", "isn't", "arent", "aren't", "wasnt", "wasn't", "werent", "weren't",
    "havent", "haven't", "hasnt", "hasn't", "hadnt", "hadn't",
    "without", "neither", "nor", "nothing", "nowhere", "none", "lack", "lacks", "lacking"
}

# Adversative / Contrastive conjunctions where the subsequent clause carries primary sentiment
CONTRASTIVE_CONJUNCTIONS = {
    "but", "however", "yet", "although", "though", "nevertheless", "nonetheless",
    "except", "whereas", "on the other hand", "still", "despite that", "in spite of"
}

# Intensifiers (boost score)
INTENSIFIERS = {
    "very": 1.5, "extremely": 1.8, "completely": 1.8, "totally": 1.8, "utterly": 2.0,
    "absolutely": 1.9, "super": 1.6, "really": 1.5, "insanely": 1.8, "hugely": 1.6,
    "so": 1.4, "incredibly": 1.8, "deeply": 1.6, "exceptionally": 1.8, "unbelievably": 1.9,
    "seriously": 1.5, "genuinely": 1.5, "truly": 1.5, "ridiculously": 1.7, "wildly": 1.7
}

# Diminishers (dampen score)
DIMINISHERS = {
    "slightly": 0.5, "somewhat": 0.6, "barely": 0.4, "a bit": 0.6, "kind of": 0.7,
    "sort of": 0.7, "marginally": 0.5, "partially": 0.6, "hardly": 0.4, "almost": 0.7,
    "fairly": 0.75, "relatively": 0.7, "moderately": 0.65
}

# Special multi-word idiomatic patterns
SPECIAL_PATTERNS = [
    # Positive idioms & inverted negatives
    (re.compile(r"\bnot\s+bad(?:\s+at\s+all)?\b", re.I), 1.6, "Positive", "Negation: 'not bad' is positive/approving"),
    (re.compile(r"\bno\s+complaints?\b", re.I), 2.2, "Positive", "Idiom: 'no complaints' indicates high satisfaction"),
    (re.compile(r"\bcouldn['']?t\s+be\s+better\b", re.I), 3.2, "Positive", "Superlative: 'couldn't be better'"),
    (re.compile(r"\bcouldn['']?t\s+be\s+happier\b", re.I), 3.2, "Positive", "Superlative: 'couldn't be happier'"),
    (re.compile(r"\bcan['']?t\s+recommend\s+(?:it\s+)?enough\b", re.I), 3.5, "Positive", "Idiom: 'can't recommend enough'"),
    (re.compile(r"\bworth\s+every\s+(?:penny|cent|dollar)\b", re.I), 3.0, "Positive", "High value praise"),
    (re.compile(r"\bworks\s+(?:like\s+a\s+charm|perfectly|flawlessly|great|beautifully)\b", re.I), 2.8, "Positive", "Functional excellence idiom"),
    (re.compile(r"\bbest\s+(?:purchase|buy|decision|investment|product|app|update)\b", re.I), 3.0, "Positive", "Superlative purchase praise"),
    (re.compile(r"\bhighly\s+recommend\b", re.I), 3.2, "Positive", "Strong positive recommendation"),
    (re.compile(r"\bmust\s+(?:have|buy|try|get)\b", re.I), 2.8, "Positive", "Enthusiastic recommendation"),
    (re.compile(r"\b10\s*/\s*10\b", re.I), 3.5, "Positive", "Perfect score rating"),
    (re.compile(r"\b5\s*(?:stars?|\/\s*5)\b", re.I), 3.2, "Positive", "5-star rating"),
    (re.compile(r"\bexceeded?\s+(?:my\s+)?expectations?\b", re.I), 2.8, "Positive", "Expectation exceeded"),
    # Negative idioms & counterfactuals
    (re.compile(r"\bthought\s+it\s+would\s+be\s+\w+\s+but\b", re.I), -2.5, "Negative", "Counterfactual: unmet expectation"),
    (re.compile(r"\bcould\s+have\s+been\s+better\b", re.I), -1.8, "Negative", "Disappointment / unmet expectation"),
    (re.compile(r"\bexpected\s+(?:much\s+)?more\b", re.I), -2.0, "Negative", "Disappointment / unmet expectation"),
    (re.compile(r"\bwaste\s+of\s+(?:time|money)\b", re.I), -3.5, "Negative", "Severe negative evaluation"),
    (re.compile(r"\bnever\s+buy\b", re.I), -3.2, "Negative", "Boycott / anti-recommendation"),
    (re.compile(r"\bdo\s+not\s+buy\b", re.I), -3.2, "Negative", "Boycott / anti-recommendation"),
    (re.compile(r"\bdon['']?t\s+waste\b", re.I), -3.2, "Negative", "Anti-recommendation"),
    (re.compile(r"\bturned\s+out\s+to\s+be\s+(?:a\s+)?(?:complete\s+)?disappointment\b", re.I), -3.8, "Negative", "Conclusive disappointment"),
    (re.compile(r"\bstay\s+away\b", re.I), -3.2, "Negative", "Boycott / strong avoidance"),
    (re.compile(r"\bnever\s+again\b", re.I), -3.5, "Negative", "Strong rejection / boycott"),
    (re.compile(r"\bwould\s+not\s+recommend\b", re.I), -3.0, "Negative", "Explicit anti-recommendation"),
    (re.compile(r"\b(?:complete|total|utter)\s+(?:waste|disaster|failure|mess|garbage|trash)\b", re.I), -4.0, "Negative", "Absolute negative evaluation"),
    (re.compile(r"\bworse\s+than\s+(?:expected|before|ever|advertised)\b", re.I), -2.8, "Negative", "Comparative disappointment"),
    (re.compile(r"\b1\s*(?:star|\/\s*5)\b", re.I), -3.5, "Negative", "1-star rating"),
    (re.compile(r"\brefund(?:ed)?\b", re.I), -2.5, "Negative", "Return / refund request signal"),
    (re.compile(r"\buninstalled\b", re.I), -2.8, "Negative", "Product abandonment signal"),
]


class SentenceCompositionAnalyzer:
    """
    Analyzes sentence-level composition, discourse connectives, and negation scope.
    """

    def __init__(self):
        pass

    def segment_clauses(self, text: str) -> List[Dict[str, Any]]:
        """
        Splits text into clauses, identifying contrastive conjunction pivots ('but', 'however').
        Clause after 'but' carries heavier semantic weight.
        """
        pattern = r"\b(but|however|yet|although|though|nevertheless|except|whereas|still)\b"
        tokens = re.split(pattern, text, flags=re.IGNORECASE)

        clauses = []
        current_role = "initial"
        current_weight = 1.0

        i = 0
        while i < len(tokens):
            part = tokens[i].strip()
            if not part:
                i += 1
                continue

            part_lower = part.lower()
            if part_lower in CONTRASTIVE_CONJUNCTIONS:
                connector = part_lower
                i += 1
                if i < len(tokens):
                    subsequent = tokens[i].strip()
                    clauses.append({
                        "connector": connector,
                        "text": subsequent,
                        "role": "adversative_pivot",
                        "weight": 2.5
                    })
            else:
                clauses.append({
                    "connector": None,
                    "text": part,
                    "role": current_role,
                    "weight": current_weight
                })
                current_role = "continuation"
            i += 1

        if not clauses:
            clauses = [{"connector": None, "text": text, "role": "main", "weight": 1.0}]

        return clauses

    def analyze_clause(self, clause_text: str) -> Dict[str, Any]:
        """
        Analyzes a single clause tracking negation scope, intensifiers, and lexicon.
        """
        words = re.findall(r"[\w'']+|[^\w\s]", clause_text)
        pos_score = 0.0
        neg_score = 0.0
        active_features = []
        negations_found = []

        negation_active = False
        negation_word = None
        negation_counter = 0
        current_multiplier = 1.0

        for idx, token in enumerate(words):
            token_clean = token.lower().strip()

            # Punctuation resets negation scope
            if token in {".", ",", ";", "!", "?"}:
                negation_active = False
                negation_word = None
                negation_counter = 0
                current_multiplier = 1.0
                continue

            # Check intensifiers
            if token_clean in INTENSIFIERS:
                current_multiplier = INTENSIFIERS[token_clean]
                continue

            # Check diminishers
            if token_clean in DIMINISHERS:
                current_multiplier = DIMINISHERS[token_clean]
                continue

            # Check negation triggers
            if token_clean in NEGATION_WORDS:
                negation_active = True
                negation_word = token_clean
                negation_counter = 0
                continue

            if negation_active:
                negation_counter += 1
                if negation_counter > 4:
                    negation_active = False
                    negation_word = None

            # 1. Positive lexicon
            if token_clean in POSITIVE_LEXICON:
                base_val = POSITIVE_LEXICON[token_clean] * current_multiplier
                if negation_active:
                    # Negated positive -> Negative (e.g. "not good" -> negative)
                    neg_score += base_val * 1.3
                    active_features.append({
                        "phrase": f"{negation_word} {token_clean}",
                        "effect": "flipped_to_negative",
                        "delta": -round(base_val * 1.3, 2)
                    })
                    negations_found.append({
                        "negator": negation_word,
                        "target": token_clean,
                        "shifted_to": "Negative"
                    })
                    negation_active = False
                else:
                    pos_score += base_val
                    active_features.append({
                        "phrase": token_clean,
                        "effect": "positive",
                        "delta": round(base_val, 2)
                    })
                current_multiplier = 1.0
                continue

            # 2. Negative lexicon
            if token_clean in NEGATIVE_LEXICON:
                base_val = NEGATIVE_LEXICON[token_clean] * current_multiplier
                # Only invert negative if negation is immediately preceding adjectives like "not bad", "not terrible"
                # Do NOT invert negative nouns like "garbage", "trash", "crap", "shit", "waste"
                # when preceded by verbs like "buy", "eat", "use" (e.g. "never buy this garbage")
                is_noun_insult = token_clean in {
                    "garbage", "trash", "crap", "shit", "waste", "scam", "fraud", "junk",
                    "disaster", "nightmare", "mess", "failure", "failures"
                }

                if negation_active and not is_noun_insult:
                    # Negated negative adjective -> Positive/Neutral approving (e.g. "not bad" -> positive)
                    pos_score += base_val * 0.8
                    active_features.append({
                        "phrase": f"{negation_word} {token_clean}",
                        "effect": "flipped_to_positive",
                        "delta": round(base_val * 0.8, 2)
                    })
                    negations_found.append({
                        "negator": negation_word,
                        "target": token_clean,
                        "shifted_to": "Positive"
                    })
                    negation_active = False
                else:
                    neg_score += base_val
                    active_features.append({
                        "phrase": token_clean,
                        "effect": "negative",
                        "delta": -round(base_val, 2)
                    })
                current_multiplier = 1.0
                continue

        return {
            "text": clause_text,
            "pos_score": pos_score,
            "neg_score": neg_score,
            "net_score": pos_score - neg_score,
            "features": active_features,
            "negations": negations_found
        }

    def analyze_full_sentence(self, raw_text: str) -> Dict[str, Any]:
        """
        Executes full sentence-level compositional analysis.
        """
        if not raw_text or not raw_text.strip():
            return {
                "sentiment": "Neutral",
                "compound_score": 0.0,
                "confidence": 0.3333,
                "probabilities": {"Positive": 0.3333, "Negative": 0.3333, "Neutral": 0.3334},
                "clauses": [],
                "special_matches": [],
                "negations": [],
                "dominant_clause": None,
                "explanation": "Empty input"
            }

        text = raw_text.strip()
        special_matches = []
        special_pos = 0.0
        special_neg = 0.0

        for pat, score, sentiment_type, desc in SPECIAL_PATTERNS:
            match = pat.search(text)
            if match:
                special_matches.append({
                    "matched": match.group(0),
                    "score": score,
                    "sentiment": sentiment_type,
                    "description": desc
                })
                if score > 0:
                    special_pos += score
                else:
                    special_neg += abs(score)

        clauses_raw = self.segment_clauses(text)
        analyzed_clauses = []
        total_weighted_pos = special_pos
        total_weighted_neg = special_neg
        all_features = []
        all_negations = []
        dominant_clause_text = None
        max_weight = 0.0

        for c in clauses_raw:
            c_res = self.analyze_clause(c["text"])
            weight = c["weight"]
            weighted_pos = c_res["pos_score"] * weight
            weighted_neg = c_res["neg_score"] * weight

            total_weighted_pos += weighted_pos
            total_weighted_neg += weighted_neg

            all_features.extend(c_res["features"])
            all_negations.extend(c_res["negations"])

            c_info = {
                "connector": c["connector"],
                "text": c["text"],
                "role": c["role"],
                "weight": weight,
                "pos_score": round(c_res["pos_score"], 2),
                "neg_score": round(c_res["neg_score"], 2),
                "net_polarity": "Positive" if c_res["net_score"] > 0.3 else ("Negative" if c_res["net_score"] < -0.3 else "Neutral")
            }
            analyzed_clauses.append(c_info)

            if weight >= max_weight and len(c["text"].strip()) > 0:
                max_weight = weight
                dominant_clause_text = c["text"]

        diff = total_weighted_pos - total_weighted_neg
        denom = total_weighted_pos + total_weighted_neg + 1.0
        compound_score = max(-1.0, min(1.0, diff / denom))

        if compound_score > 0.15:
            p_pos = 0.5 + 0.45 * (compound_score ** 0.75)
            p_neg = max(0.02, 0.15 * (1.0 - compound_score))
            p_neu = max(0.03, 1.0 - p_pos - p_neg)
            pred_sentiment = "Positive"
        elif compound_score < -0.15:
            abs_score = abs(compound_score)
            p_neg = 0.5 + 0.45 * (abs_score ** 0.75)
            p_pos = max(0.02, 0.15 * (1.0 - abs_score))
            p_neu = max(0.03, 1.0 - p_pos - p_neg)
            pred_sentiment = "Negative"
        else:
            p_neu = 0.60 - abs(compound_score) * 0.4
            rem = (1.0 - p_neu) / 2.0
            p_pos = max(0.0, rem + (compound_score * 0.15))
            p_neg = max(0.0, rem - (compound_score * 0.15))
            pred_sentiment = "Neutral"

        # Re-normalise so probabilities always sum to exactly 1.0
        total_p = p_pos + p_neg + p_neu
        if total_p > 0:
            p_pos = round(p_pos / total_p, 4)
            p_neg = round(p_neg / total_p, 4)
        else:
            p_pos, p_neg = 0.3333, 0.3333
        p_neu = round(1.0 - p_pos - p_neg, 4)

        confidence = max(p_pos, p_neg, p_neu)

        explanation_parts = []
        if len(analyzed_clauses) > 1:
            pivot_clause = next((c for c in analyzed_clauses if c["role"] == "adversative_pivot"), None)
            if pivot_clause:
                explanation_parts.append(
                    f"Discourse contrast detected: sentence pivots after '{pivot_clause['connector']}' with primary weight on '{pivot_clause['text'][:40]}...'"
                )
        if all_negations:
            neg_descs = [f"'{n['negator']} {n['target']}' (shifted to {n['shifted_to']})" for n in all_negations]
            explanation_parts.append(f"Negation scope resolved: {', '.join(neg_descs)}")
        if special_matches:
            for sm in special_matches:
                explanation_parts.append(f"Syntactic pattern: {sm['description']}")

        if not explanation_parts:
            if pred_sentiment == "Positive":
                explanation_parts.append("Positive evaluative terms dominate the overall sentence composition.")
            elif pred_sentiment == "Negative":
                explanation_parts.append("Negative evaluative terms dominate the overall sentence composition.")
            else:
                explanation_parts.append("Informational content with neutral or balanced sentiment trajectory.")

        return {
            "sentiment": pred_sentiment,
            "compound_score": round(compound_score, 4),
            "confidence": round(confidence, 4),
            "probabilities": {
                "Positive": p_pos,
                "Negative": p_neg,
                "Neutral": p_neu
            },
            "clauses": analyzed_clauses,
            "special_matches": special_matches,
            "negations": all_negations,
            "features": all_features,
            "dominant_clause": dominant_clause_text,
            "structural_explanation": " • ".join(explanation_parts)
        }
