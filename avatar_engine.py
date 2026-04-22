import json
import os

from dotenv import load_dotenv
from openai import AsyncOpenAI

from course_content import get_module

load_dotenv()

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


def build_system_prompt(course_title: str, module: dict) -> str:
    concepts = ", ".join(module["key_concepts"])
    return (
        f"You are Professor Ada, an expert and enthusiastic instructor teaching {course_title}. "
        f"Current module: '{module['name']}'. "
        f"Key concepts covered: {concepts}. "
        f"Context: {module['content_summary']} "
        f"Respond conversationally as if speaking aloud to a student — warm, clear, and encouraging. "
        f"Keep responses under 80 words so the avatar can speak them comfortably. "
        f"Do not use bullet points or markdown; use natural spoken sentences only."
    )


async def stream_response(question: str, course_title: str, module: dict):
    """Async generator yielding SSE-formatted lines."""
    client = get_client()
    system_prompt = build_system_prompt(course_title, module)

    try:
        stream = await client.chat.completions.create(
            model="gpt-4o",
            max_tokens=200,
            stream=True,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
        )
        async for chunk in stream:
            text = chunk.choices[0].delta.content
            if text:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "event: done\ndata: {}\n\n"
    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
