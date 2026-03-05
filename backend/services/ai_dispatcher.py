"""AI Dispatcher service – KKU Gen AI triage and summarization."""

import json
import logging
import os

from dotenv import load_dotenv
from openai import OpenAI

from models.schemas import TriageResult
from prompts.dispatcher_prompt import DISPATCHER_SYSTEM_PROMPT, DISPATCHER_USER_TEMPLATE

load_dotenv()
logger = logging.getLogger(__name__)

# KKU Gen AI endpoint (OpenAI-compatible)
API_KEY = os.environ.get("API_KEY", "")
BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://gen.ai.kku.ac.th/api/v1")
MODEL = os.environ.get("LLM_MODEL", "gpt-5-nano")

MAX_RETRIES = 2

client = OpenAI(api_key=API_KEY, base_url=BASE_URL)

async def analyze_incident(text: str) -> TriageResult:
    """Send incident text to KKU Gen AI and return a validated TriageResult."""
    user_message = DISPATCHER_USER_TEMPLATE.format(incident_text=text)
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                temperature=0.2,
                messages=[
                    {"role": "system", "content": DISPATCHER_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                stream=False,
            )

            content = response.choices[0].message.content
            
            # --- แก้ไข BUG: ลบ Markdown code blocks ออกถ้า AI เผลอส่งมา ---
            clean_content = content.replace("```json", "").replace("```", "").strip()
            
            parsed = json.loads(clean_content)

            # Validate through Pydantic
            triage = TriageResult(**parsed)
            logger.info(
                "Triage complete – severity=%s score=%d",
                triage.severity_level,
                triage.severity_score,
            )
            return triage

        except json.JSONDecodeError as exc:
            logger.warning("Attempt %d: JSON parse error – %s", attempt, exc)
            last_error = exc
        except Exception as exc:
            logger.warning("Attempt %d: API/Validation error – %s", attempt, exc)
            last_error = exc

    # All retries exhausted – return a safe fallback
    logger.error("AI analysis failed after %d attempts: %s", MAX_RETRIES, last_error)
    return TriageResult(
        severity_level="HIGH",
        severity_score=7,
        category="อื่นๆ",
        victim_count=None,
        key_symptoms=["ไม่สามารถวิเคราะห์ได้อัตโนมัติ"],
        summary_th="ระบบ AI ไม่สามารถวิเคราะห์เหตุการณ์ได้ กรุณาติดต่อผู้แจ้งเหตุโดยตรง",
        required_units=["รถพยาบาล"],
        first_aid_advice="รอเจ้าหน้าที่ ณ จุดเกิดเหตุ อย่าเคลื่อนย้ายผู้บาดเจ็บ",
        confidence_score=0.0,
    )