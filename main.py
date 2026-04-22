import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from avatar_engine import stream_response
from course_content import get_all_courses_summary, get_course, get_module

app = FastAPI(title="AI Teaching Avatar")

STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# In-memory session progress: session_id -> {course_id, module_id}
_sessions: dict[str, dict] = {}


@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/courses")
async def list_courses():
    return get_all_courses_summary()


@app.get("/api/course/{course_id}")
async def get_course_detail(course_id: str):
    course = get_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return {
        "id": course["id"],
        "title": course["title"],
        "subtitle": course["subtitle"],
        "modules": [
            {"id": m["id"], "name": m["name"], "sample_questions": m["sample_questions"]}
            for m in course["modules"]
        ],
    }


@app.get("/api/module/{course_id}/{module_id}")
async def get_module_detail(course_id: str, module_id: int):
    module = get_module(course_id, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    return {
        "id": module["id"],
        "name": module["name"],
        "key_concepts": module["key_concepts"],
        "sample_questions": module["sample_questions"],
    }


@app.get("/api/stream")
async def stream_ask(
    q: str = Query(..., description="Student question"),
    course_id: str = Query("biology_101"),
    module_id: int = Query(1),
):
    course = get_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    module = get_module(course_id, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    return StreamingResponse(
        stream_response(q, course["title"], module),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )
