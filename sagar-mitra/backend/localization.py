"""
Deterministic multilingual SMS template engine.
All native-script templates are strictly under 70 characters (UCS-2 single-part SMS).
Supports: Tamil (ta), Telugu (te), Hindi (hi), Malayalam (ml), Bengali (bn).
"""

TEMPLATES: dict[str, dict[str, str]] = {
    # ── Tamil ───────────────────────────────────────────────────────────────
    "ta": {
        "LAUNCH":        "[வழி] திசை:{bearing}° தூரம்:{dist}km அலை:{wave}m. புறப்படுங்கள்.",
        "REACHED":       "[மீன்] மேலை அடைந்தது! 2km-க்குள் வலை வீசவும்.",
        "BORDER_ALERT":  "[ஆபத்து!] எல்லை {dist}km! உடனே திரும்புங்கள்!",
        "WEATHER_DANGER":"[எச்சரிக்கை] அலை {wave}m! கரை திரும்புங்கள்!",
        "SAFE_RETURN":   "[பாதுகாப்பு] கரை:{bearing}° தூரம்:{dist}km",
        "SOS_ACK":       "[SOS] அவசரநிலை! உதவி வருகிறது. GPS:{lat},{lon}",
    },
    # ── Telugu ──────────────────────────────────────────────────────────────
    "te": {
        "LAUNCH":        "[మార్గం] దిశ:{bearing}° దూరం:{dist}km అలలు:{wave}m.",
        "REACHED":       "[జోన్] చేపల ప్రాంతం చేరింది! 2km లో వల వేయండి.",
        "BORDER_ALERT":  "[ప్రమాదం!] సరిహద్దు {dist}km! వెంటనే మరలండి!",
        "WEATHER_DANGER":"[హెచ్చరిక] అలలు {wave}m! ఒడ్డుకు రండి!",
        "SAFE_RETURN":   "[తిరుగు] ఒడ్డు:{bearing}° దూరం:{dist}km",
        "SOS_ACK":       "[SOS] అత్యవసరం! సహాయం వస్తోంది. GPS:{lat},{lon}",
    },
    # ── Hindi ───────────────────────────────────────────────────────────────
    "hi": {
        "LAUNCH":        "[दिशा] कोण:{bearing}° दूरी:{dist}km लहरें:{wave}m.",
        "REACHED":       "[मछली] क्षेत्र पहुंचे! 2km दायरे में जाल डालें।",
        "BORDER_ALERT":  "[खतरा!] सीमा {dist}km! तुरंत मुड़ें!",
        "WEATHER_DANGER":"[चेतावनी] लहरें {wave}m! किनारे लौटें!",
        "SAFE_RETURN":   "[वापसी] बंदरगाह:{bearing}° दूरी:{dist}km",
        "SOS_ACK":       "[SOS] आपातकाल! सहायता आ रही है। GPS:{lat},{lon}",
    },
    # ── Malayalam ───────────────────────────────────────────────────────────
    "ml": {
        "LAUNCH":        "[ദിശ] {bearing}° {dist}km. തിര:{wave}m. പോകുക.",
        "REACHED":       "[മേഖല] മത്സ്യ മേഖലയിൽ! 2km-ൽ വല ഇടുക.",
        "BORDER_ALERT":  "[അപകടം!] അതിർത്തി {dist}km! ഉടൻ തിരിയുക!",
        "WEATHER_DANGER":"[മുന്നറിയിപ്പ്] തിര {wave}m! കരയ്ക്ക് മടങ്ങുക!",
        "SAFE_RETURN":   "[മടക്കം] തീരം:{bearing}° ദൂരം:{dist}km",
        "SOS_ACK":       "[SOS] അടിയന്തരം! സഹായം വരുന്നു. GPS:{lat},{lon}",
    },
    # ── Bengali ─────────────────────────────────────────────────────────────
    "bn": {
        "LAUNCH":        "[দিক] {bearing}° দূরত্ব:{dist}km ঢেউ:{wave}m।",
        "REACHED":       "[মাছ] মৎস্য অঞ্চলে পৌঁছেছেন! ২কিমি-এ জাল ফেলুন।",
        "BORDER_ALERT":  "[বিপদ!] সীমানা {dist}km! তৎক্ষণাৎ ফিরুন!",
        "WEATHER_DANGER":"[সতর্কতা] ঢেউ {wave}m! তীরে ফিরুন!",
        "SAFE_RETURN":   "[ফেরা] বন্দর:{bearing}° দূরত্ব:{dist}km",
        "SOS_ACK":       "[SOS] জরুরি! সাহায্য আসছে। GPS:{lat},{lon}",
    },
}

FALLBACK_LANG = "ta"


def get_message(lang: str, key: str, **kwargs) -> str:
    """
    Render a localised SMS template.
    Falls back to Tamil if `lang` is not supported.
    All produced strings are under 70 chars for UCS-2 single-part SMS.
    """
    lang_map = TEMPLATES.get(lang, TEMPLATES[FALLBACK_LANG])
    template = lang_map.get(key, TEMPLATES[FALLBACK_LANG].get(key, "Advisory unavailable."))
    msg = template.format(**{k: v for k, v in kwargs.items()})
    # Safety guard: truncate to 70 chars to stay in single-part UCS-2
    return msg[:70]


def supported_languages() -> list[str]:
    return list(TEMPLATES.keys())
