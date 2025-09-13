"""
Database models for Survey Service
"""
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base

class SurveyContext(Base):
    __tablename__ = "brls_survey_context"
    id = Column(String, primary_key=True)
    well_id = Column(String, index=True)
    mwd_tool_family = Column(String, nullable=False, default="Tensor")
    grid = Column(JSON, nullable=False, default=dict)
    datums = Column(JSON, nullable=False, default=dict)
    formation = Column(JSON, nullable=True)
    mag_field = Column(JSON, nullable=False, default=dict)
    tool_cal = Column(JSON, nullable=True)
    quality_tags = Column(JSON, nullable=False, default=list)
    provenance = Column(JSON, nullable=False, default=dict)
    active_from = Column(DateTime, nullable=False, default=datetime.utcnow)

class SurveyInput(Base):
    __tablename__ = "brls_survey_input"
    id = Column(String, primary_key=True)
    well_id = Column(String, index=True)
    time = Column(DateTime, default=datetime.utcnow)
    md_m = Column(Float, nullable=False)
    sensors = Column(JSON, nullable=True)  # {Mx,My,Mz,Gx,Gy,Gz,Temp}
    inc_deg = Column(Float, nullable=True)
    azi_deg = Column(Float, nullable=True)
    toolface_deg = Column(Float, nullable=True)
    run_id = Column(String, nullable=True)
    context_id = Column(String, ForeignKey("brls_survey_context.id"), nullable=True)
    source = Column(String, nullable=False, default="Manual")
    meta = Column(JSON, nullable=True)

class SurveySolution(Base):
    __tablename__ = "brls_survey_solution"
    id = Column(String, primary_key=True)
    input_id = Column(String, ForeignKey("brls_survey_input.id"))
    context_id = Column(String, ForeignKey("brls_survey_context.id"), nullable=True)
    inc_deg = Column(Float, nullable=False)
    azi_deg = Column(Float, nullable=False)
    tvd_m = Column(Float, nullable=True)
    northing_m = Column(Float, nullable=True)
    easting_m = Column(Float, nullable=True)
    dogleg_deg30m = Column(Float, nullable=True)
    frame = Column(String, nullable=False, default="LOCAL")
    quality = Column(Integer, nullable=False, default=1)  # 0 bad,1 suspect,2 good
    flags = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)