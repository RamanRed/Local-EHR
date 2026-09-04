"""
transcribe.py - Local audio transcription using Qwen2-Audio-7B-Instruct via Ollama.

Primary path  : POST audio to Ollama's /api/generate with vision/audio capable model.
Fallback path : If Ollama audio is unavailable, use Whisper via Ollama's OpenAI-compat API.

Usage:
    python transcribe.py <audio_file_path>

Returns JSON: {"text": "<transcription>"}
"""

import sys
import json
import os
import base64
import urllib.request
import urllib.error


OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_AUDIO_MODEL", "qwen2-audio")  # Ollama model tag for audio
OLLAMA_WHISPER_MODEL = os.environ.get("OLLAMA_WHISPER_MODEL", "whisper")


def _post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def transcribe_via_ollama_generate(audio_path: str) -> str:
    """
    Send audio file as base64 to Ollama /api/generate using Qwen2-Audio model.
    Ollama exposes multimodal models (images/audio) through the 'images' field.
    """
    with open(audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode("utf-8")

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": "Please transcribe the audio exactly as spoken. Return only the transcription text, nothing else.",
        "images": [audio_b64],   # Ollama multimodal field (works for audio-capable models)
        "stream": False,
        "options": {
            "temperature": 0,
        },
    }

    url = f"{OLLAMA_BASE_URL}/api/generate"
    result = _post_json(url, payload)
    return result.get("response", "").strip()


def transcribe_via_ollama_whisper(audio_path: str) -> str:
    """
    Fallback: Use Ollama's OpenAI-compatible /v1/audio/transcriptions endpoint
    with a Whisper model served through Ollama.
    """
    import urllib.parse

    # Read file
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    # Construct multipart/form-data manually
    boundary = "----OllamaWhisperBoundary"
    filename = os.path.basename(audio_path)

    body_parts = []
    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\n{OLLAMA_WHISPER_MODEL}".encode())
    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"language\"\r\n\r\nen".encode())
    body_parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: audio/webm\r\n\r\n".encode()
        + audio_bytes
    )
    body_parts.append(f"--{boundary}--".encode())

    body = b"\r\n".join(body_parts)

    url = f"{OLLAMA_BASE_URL}/v1/audio/transcriptions"
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    return result.get("text", "").strip()


def transcribe_via_transformers(audio_path: str) -> str:
    """
    Deep fallback: Use Qwen2-Audio-7B-Instruct directly via HuggingFace transformers.
    This requires: pip install transformers torch librosa soundfile
    """
    import warnings
    warnings.filterwarnings("ignore")

    from transformers import AutoProcessor, AutoModelForSeq2SeqLM
    import torch

    model_id = "Qwen/Qwen2-Audio-7B-Instruct"
    processor = AutoProcessor.from_pretrained(model_id)
    model = AutoModelForSeq2SeqLM.from_pretrained(
        model_id,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map="auto",
    )

    conversation = [
        {
            "role": "user",
            "content": [
                {"type": "audio", "audio_url": audio_path},
                {"type": "text", "text": "Please transcribe the audio exactly as spoken. Return only the transcription."},
            ],
        }
    ]

    text = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
    inputs = processor(text=text, audio=audio_path, return_tensors="pt")
    inputs = inputs.to(model.device)

    with torch.no_grad():
        generated = model.generate(**inputs, max_new_tokens=512, do_sample=False)

    # Decode only the generated tokens (not the input prompt)
    input_len = inputs["input_ids"].shape[1]
    new_tokens = generated[:, input_len:]
    transcription = processor.batch_decode(new_tokens, skip_special_tokens=True)[0].strip()

    return transcription


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python transcribe.py <audio_file_path>"}))
        sys.exit(1)

    audio_path = sys.argv[1]

    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"File not found: {audio_path}"}))
        sys.exit(1)

    # Try Ollama Qwen2-Audio first (fastest, no GPU memory overhead per request)
    try:
        text = transcribe_via_ollama_generate(audio_path)
        if text:
            print(json.dumps({"text": text}))
            return
    except Exception as e:
        print(f"[transcribe] Ollama generate failed: {e}", file=sys.stderr)

    # Try Ollama Whisper compat endpoint
    try:
        text = transcribe_via_ollama_whisper(audio_path)
        if text:
            print(json.dumps({"text": text}))
            return
    except Exception as e:
        print(f"[transcribe] Ollama whisper endpoint failed: {e}", file=sys.stderr)

    # Final fallback: load Qwen2-Audio-7B-Instruct directly via transformers
    try:
        text = transcribe_via_transformers(audio_path)
        print(json.dumps({"text": text}))
        return
    except Exception as e:
        print(f"[transcribe] Transformers fallback failed: {e}", file=sys.stderr)
        print(json.dumps({"text": "", "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
