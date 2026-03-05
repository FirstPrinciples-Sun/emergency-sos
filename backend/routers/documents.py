"""Document storage endpoints – upload, list, download, delete via Supabase Storage."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from pydantic import BaseModel

from services.auth import verify_liff_token, get_line_profile, extract_token
from services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

BUCKET_NAME = "documents"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class DocumentMeta(BaseModel):
    id: str
    filename: str
    file_size: int
    content_type: str
    uploaded_at: str
    line_user_id: str


async def _get_user_id(authorization: str | None) -> str:
    """Extract and verify the LINE user from the Authorization header."""
    token = extract_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="กรุณาเข้าสู่ระบบด้วย LINE")

    verify = await verify_liff_token(token)
    if not verify:
        raise HTTPException(status_code=401, detail="Token ไม่ถูกต้องหรือหมดอายุ")

    profile = await get_line_profile(token)
    if not profile or "userId" not in profile:
        raise HTTPException(status_code=401, detail="ไม่สามารถระบุผู้ใช้งานได้")

    return profile["userId"]


@router.post("/upload", response_model=DocumentMeta)
async def upload_document(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    """Upload a document to Supabase Storage."""
    user_id = await _get_user_id(authorization)

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="ไฟล์มีขนาดใหญ่เกิน 10 MB")

    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="ระบบจัดเก็บเอกสารไม่พร้อมใช้งาน")

    doc_id = str(uuid.uuid4())
    storage_path = f"{user_id}/{doc_id}/{file.filename}"

    try:
        client.storage.from_(BUCKET_NAME).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as exc:
        logger.error("Storage upload error: %s", exc)
        raise HTTPException(status_code=500, detail="อัปโหลดไม่สำเร็จ")

    # Save metadata to documents table
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": doc_id,
        "filename": file.filename,
        "file_size": len(content),
        "content_type": file.content_type or "application/octet-stream",
        "storage_path": storage_path,
        "uploaded_at": now,
        "line_user_id": user_id,
    }

    try:
        client.table("documents").insert(record).execute()
    except Exception as exc:
        logger.error("DB insert error: %s", exc)
        # Try to clean up the uploaded file
        try:
            client.storage.from_(BUCKET_NAME).remove([storage_path])
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="บันทึกข้อมูลไม่สำเร็จ")

    logger.info("Document uploaded: %s by user %s", file.filename, user_id[:8])
    return DocumentMeta(
        id=doc_id,
        filename=file.filename or "untitled",
        file_size=len(content),
        content_type=file.content_type or "application/octet-stream",
        uploaded_at=now,
        line_user_id=user_id,
    )


@router.get("", response_model=list[DocumentMeta])
async def list_user_documents(
    authorization: str | None = Header(default=None),
):
    """List all documents belonging to the authenticated user."""
    user_id = await _get_user_id(authorization)

    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="ระบบจัดเก็บเอกสารไม่พร้อมใช้งาน")

    try:
        result = (
            client.table("documents")
            .select("id, filename, file_size, content_type, uploaded_at, line_user_id")
            .eq("line_user_id", user_id)
            .order("uploaded_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as exc:
        logger.error("DB query error: %s", exc)
        raise HTTPException(status_code=500, detail="ไม่สามารถโหลดเอกสารได้")


@router.get("/{doc_id}/download")
async def download_document(
    doc_id: str,
    authorization: str | None = Header(default=None),
):
    """Get a signed download URL for a document."""
    user_id = await _get_user_id(authorization)

    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="ระบบจัดเก็บเอกสารไม่พร้อมใช้งาน")

    try:
        result = (
            client.table("documents")
            .select("storage_path, line_user_id")
            .eq("id", doc_id)
            .single()
            .execute()
        )
        doc = result.data
    except Exception:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")

    if not doc or doc["line_user_id"] != user_id:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เข้าถึงเอกสารนี้")

    try:
        signed = client.storage.from_(BUCKET_NAME).create_signed_url(
            doc["storage_path"], 3600
        )
        return {"url": signed["signedURL"]}
    except Exception as exc:
        logger.error("Signed URL error: %s", exc)
        raise HTTPException(status_code=500, detail="สร้างลิงก์ดาวน์โหลดไม่สำเร็จ")


@router.delete("/{doc_id}")
async def delete_document_endpoint(
    doc_id: str,
    authorization: str | None = Header(default=None),
):
    """Delete a document (file + metadata)."""
    user_id = await _get_user_id(authorization)

    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="ระบบจัดเก็บเอกสารไม่พร้อมใช้งาน")

    try:
        result = (
            client.table("documents")
            .select("storage_path, line_user_id")
            .eq("id", doc_id)
            .single()
            .execute()
        )
        doc = result.data
    except Exception:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")

    if not doc or doc["line_user_id"] != user_id:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ลบเอกสารนี้")

    # Delete from storage
    try:
        client.storage.from_(BUCKET_NAME).remove([doc["storage_path"]])
    except Exception as exc:
        logger.warning("Storage delete warning: %s", exc)

    # Delete metadata
    try:
        client.table("documents").delete().eq("id", doc_id).execute()
    except Exception as exc:
        logger.error("DB delete error: %s", exc)
        raise HTTPException(status_code=500, detail="ลบเอกสารไม่สำเร็จ")

    logger.info("Document %s deleted by user %s", doc_id[:8], user_id[:8])
    return {"status": "deleted"}
