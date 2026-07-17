"""Delivery and visual analysis for recorded interview answers."""
from __future__ import annotations

import re
from pathlib import Path

FILLERS = ["嗯", "呃", "然后", "就是", "那个", "其实", "基本上", "然后呢", "you know", "um", "uh"]


def analyze_delivery(transcript: str, duration_sec: int | None) -> dict:
    text = transcript or ""
    chinese_chars = len(re.findall(r"[\u4e00-\u9fff]", text))
    english_words = len(re.findall(r"\b[A-Za-z]+\b", text))
    estimated_words = english_words + round(chinese_chars / 1.7)
    minutes = max((duration_sec or max(1, round(estimated_words / 180 * 60))) / 60, 1 / 60)
    words_per_minute = round(estimated_words / minutes)
    filler_counts = {filler: len(re.findall(re.escape(filler), text, flags=re.IGNORECASE)) for filler in FILLERS}
    filler_counts = {key: value for key, value in filler_counts.items() if value}
    sentences = [item.strip() for item in re.split(r"[。！？!?；;\n]+", text) if item.strip()]
    avg_sentence_length = round(sum(len(item) for item in sentences) / max(1, len(sentences)), 1)
    repetition_candidates = re.findall(r"[\u4e00-\u9fff]{2,8}", text)
    repeated = [phrase for phrase, count in __import__("collections").Counter(repetition_candidates).most_common(8) if count >= 3]
    pace_score = 100 - min(45, abs(words_per_minute - 180) // 2)
    filler_score = max(0, 100 - sum(filler_counts.values()) * 7)
    sentence_score = max(30, 100 - max(0, avg_sentence_length - 32) * 2)
    filler_total = sum(filler_counts.values())
    long_sentence_count = sum(len(item) > 45 for item in sentences)
    explicit_pauses = len(re.findall(r"[，,。！？!?；;…\n]", text))
    spoken_seconds = estimated_words / max(1, words_per_minute) * 60
    inferred_silence = max(0.0, float(duration_sec or 0) - spoken_seconds)
    pause_estimate = explicit_pauses + round(inferred_silence / 1.5)
    overall = round(pace_score * 0.4 + filler_score * 0.35 + sentence_score * 0.25)
    return {
        "estimated_words": estimated_words,
        "words_per_minute": words_per_minute,
        "filler_counts": filler_counts,
        "filler_total": filler_total,
        "filler_count": filler_total,
        "filler_rate": round(filler_total / max(1, estimated_words) * 100, 1),
        "sentence_count": len(sentences),
        "average_sentence_length": avg_sentence_length,
        "long_sentence_count": long_sentence_count,
        "repeated_phrases": repeated,
        "repetition_count": len(repeated),
        "pause_estimate": pause_estimate,
        "answer_duration_sec": duration_sec,
        "estimated_silence_sec": round(inferred_silence, 1),
        "pace_status": "偏快" if words_per_minute > 230 else "偏慢" if words_per_minute < 120 else "适中",
        "score": max(0, min(100, overall)),
    }


def analyze_video_frames(path: Path) -> dict:
    try:
        import cv2
    except ImportError:
        return {"available": False, "reason": "opencv unavailable"}
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        return {"available": False, "reason": "video cannot be opened"}
    fps = capture.get(cv2.CAP_PROP_FPS) or 25
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = round(frame_count / fps) if frame_count else None
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
    sampled = face_frames = eye_frames = centered_frames = 0
    step = max(1, int(fps * 2))
    index = 0
    while sampled < 180:
        ok, frame = capture.read()
        if not ok:
            break
        if index % step:
            index += 1
            continue
        index += 1
        sampled += 1
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
        if len(faces):
            face_frames += 1
            x, y, w, h = max(faces, key=lambda item: item[2] * item[3])
            center_x = (x + w / 2) / frame.shape[1]
            center_y = (y + h / 2) / frame.shape[0]
            if abs(center_x - 0.5) <= 0.18 and abs(center_y - 0.45) <= 0.22:
                centered_frames += 1
            roi = gray[y:y + h, x:x + w]
            if len(eye_cascade.detectMultiScale(roi, scaleFactor=1.1, minNeighbors=4, minSize=(12, 12))) >= 1:
                eye_frames += 1
    capture.release()
    face_ratio = round(face_frames / max(1, sampled), 3)
    eye_ratio = round(eye_frames / max(1, face_frames), 3)
    centered_ratio = round(centered_frames / max(1, face_frames), 3)
    score = round((face_ratio * 0.35 + eye_ratio * 0.35 + centered_ratio * 0.3) * 100)
    return {
        "available": True,
        "duration_sec": duration,
        "sampled_frames": sampled,
        "face_presence_ratio": face_ratio,
        "eye_visibility_ratio": eye_ratio,
        "centered_face_ratio": centered_ratio,
        "visual_score": score,
        "note": "目光指标基于眼部可见和面部居中比例，仅用于训练参考",
    }
