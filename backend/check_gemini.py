"""Check backend Gemini connectivity without exposing credentials."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(Path(__file__).with_name(".env"))

TIMEOUT_SECONDS = 15
DEFAULT_MODEL = "gemini-2.5-flash"


async def check_gemini() -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=TIMEOUT_SECONDS * 1000),
    )
    response = await asyncio.wait_for(
        asyncio.to_thread(
            client.models.generate_content,
            model=model,
            contents="Reply with the single word OK.",
            config=types.GenerateContentConfig(
                response_mime_type="text/plain",
                temperature=0,
            ),
        ),
        timeout=TIMEOUT_SECONDS,
    )
    if not response.text:
        raise RuntimeError("Gemini returned an empty response")
    return "Gemini OK"


def main() -> int:
    try:
        print(asyncio.run(check_gemini()))
        return 0
    except Exception as exception:
        print(f"Gemini check failed: {exception}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
