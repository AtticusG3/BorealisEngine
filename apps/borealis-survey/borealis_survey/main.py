"""
FastAPI application for Borealis Survey Service with SQLite persistence
"""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from uuid import uuid4
from datetime import datetime
import csv, io
from sqlalchemy import select
from .settings import Settings
from .db import ENGINE, Base, SessionLocal
from .models import SurveyContext, SurveyInput, SurveySolution
from .verifier import verify
from .maths import mc_step, min_curvature

settings = Settings()
app = FastAPI(title="Borealis Survey")

# Create DB tables
Base.metadata.create_all(bind=ENGINE)

class ContextModel(BaseModel):
    well_id: str
    mwd_tool_family: str = "Tensor"
    grid: dict = {}
    datums: dict = {}
    formation: dict | None = None
    mag_field: dict = {}
    tool_cal: dict | None = None
    provenance: dict = {}

class ContextResponse(BaseModel):
    id: str
    well_id: str
    mwd_tool_family: str
    grid: dict
    datums: dict
    formation: dict | None
    mag_field: dict
    tool_cal: dict | None
    quality_tags: list
    provenance: dict
    active_from: datetime

@app.get("/health")
def health():
    return {"status": "ok", "service": "borealis-survey"}

@app.post("/surveys/contexts")
def upsert_context(body: ContextModel):
    with SessionLocal() as s:
        ctx = SurveyContext(
            id=str(uuid4()), well_id=body.well_id,
            mwd_tool_family=body.mwd_tool_family,
            grid=body.grid, datums=body.datums,
            formation=body.formation, mag_field=body.mag_field,
            tool_cal=body.tool_cal, quality_tags=["UNVERIFIED"], provenance=body.provenance
        )
        s.add(ctx); s.commit()
        return {"id": ctx.id}

@app.get("/surveys/contexts/{well_id}/active")
def get_context(well_id: str):
    with SessionLocal() as s:
        row = s.execute(select(SurveyContext).where(SurveyContext.well_id==well_id).order_by(SurveyContext.active_from.desc())).scalars().first()
        if not row:
            return None
        return {
            "id": row.id,
            "well_id": row.well_id,
            "mwd_tool_family": row.mwd_tool_family,
            "grid": row.grid,
            "datums": row.datums,
            "formation": row.formation,
            "mag_field": row.mag_field,
            "tool_cal": row.tool_cal,
            "quality_tags": row.quality_tags,
            "provenance": row.provenance,
            "active_from": row.active_from
        }

class InputJSON(BaseModel):
    well_id: str
    md_m: float
    inc_deg: float | None = None
    azi_deg: float | None = None
    sensors: dict | None = None
    run_id: str | None = None
    source: str = "Manual"

@app.post("/surveys/inputs")
def post_input(body: InputJSON):
    with SessionLocal() as s:
        ctx = s.execute(select(SurveyContext).where(SurveyContext.well_id==body.well_id).order_by(SurveyContext.active_from.desc())).scalars().first()
        inp = SurveyInput(
            id=str(uuid4()), well_id=body.well_id, md_m=body.md_m,
            sensors=body.sensors, inc_deg=body.inc_deg, azi_deg=body.azi_deg,
            run_id=body.run_id, context_id=ctx.id if ctx else None,
            source=body.source
        )
        s.add(inp); s.commit()
        # Compute solution row-wise using minimum curvature with previous point (if any)
        prev = s.execute(select(SurveySolution).join(SurveyInput, SurveyInput.id==SurveySolution.input_id)
                         .where(SurveyInput.well_id==body.well_id)
                         .order_by(SurveyInput.md_m.desc())).scalars().first()
        ctx_dict = None
        if ctx:
            ctx_dict = {
                "id": ctx.id,
                "well_id": ctx.well_id,
                "mwd_tool_family": ctx.mwd_tool_family,
                "grid": ctx.grid,
                "datums": ctx.datums,
                "formation": ctx.formation,
                "mag_field": ctx.mag_field,
                "tool_cal": ctx.tool_cal,
                "quality_tags": ctx.quality_tags,
                "provenance": ctx.provenance,
                "active_from": ctx.active_from
            }
        flags = verify(ctx_dict, settings.MAG_MODEL_MAX_AGE_DAYS)
        inc, azi = (body.inc_deg or 0.0), (body.azi_deg or 0.0)
        if prev:
            # need previous input/solution to compute step — fetch last input/solution pair
            prev_input = s.execute(select(SurveyInput).where(SurveyInput.id==prev.input_id)).scalars().first()
            n,e,tvd = mc_step(prev_input.md_m, prev.inc_deg, prev.azi_deg, prev.northing_m or 0.0, prev.easting_m or 0.0, prev.tvd_m or 0.0, body.md_m, inc, azi)
            dls,_ = min_curvature(prev_input.md_m, prev.inc_deg, prev.azi_deg, body.md_m, inc, azi)
        else:
            n,e,tvd = 0.0,0.0,0.0
            dls = 0.0
        sol = SurveySolution(
            id=str(uuid4()), input_id=inp.id, context_id=ctx.id if ctx else None,
            inc_deg=inc, azi_deg=azi, tvd_m=tvd, northing_m=n, easting_m=e, dogleg_deg30m=dls,
            frame="LOCAL", quality=2 if not flags else 1, flags=flags
        )
        s.add(sol); s.commit()
        return {"input_id": inp.id, "solution_id": sol.id, "flags": flags}

@app.post("/surveys/inputs/csv")
async def post_input_csv(well_id: str = Form(...), file: UploadFile = File(...)):
    data = await file.read()
    text = data.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    inserted = 0
    for row in reader:
        body = InputJSON(
            well_id=well_id,
            md_m=float(row.get("MD") or row.get("md") or row.get("md_m")),
            inc_deg=float(row.get("INC") or row.get("inc_deg") or 0),
            azi_deg=float(row.get("AZI") or row.get("azi_deg") or 0),
            sensors=None, source="CSV"
        )
        post_input(body)  # reuse logic
        inserted += 1
    return {"rows": inserted}

@app.get("/surveys/solutions")
def list_solutions(wellId: str):
    with SessionLocal() as s:
        rows = s.execute(
            select(SurveySolution, SurveyInput.md_m).join(SurveyInput, SurveyInput.id==SurveySolution.input_id)
            .where(SurveyInput.well_id==wellId).order_by(SurveyInput.md_m.asc())
        ).all()
        out = []
        for sol, md in rows:
            out.append({
                "id": sol.id, "md_m": md, "inc_deg": sol.inc_deg, "azi_deg": sol.azi_deg,
                "tvd_m": sol.tvd_m, "n": sol.northing_m, "e": sol.easting_m, "dls_deg30m": sol.dogleg_deg30m,
                "flags": sol.flags, "frame": sol.frame
            })
        return out