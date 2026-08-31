"""
Pydantic schemas for SAGAR-MITRA backend.
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class CaptainProfile(BaseModel):
    name: str = Field(..., example="Captain Murugan")
    phone: str = Field(..., example="+919876543210")
    language: str = Field(default="ta", example="ta")  # ta, te, hi, ml, bn
    harbor_name: str = Field(default="Nagapattinam", example="Nagapattinam")
    lat: float = Field(..., example=10.767)
    lon: float = Field(..., example=79.842)


class FriendTripRequest(BaseModel):
    friend_name: str = Field(..., example="Fisherman Selvam")
    friend_phone: str = Field(..., example="+919444123456")
    language: str = Field(default="ta", example="ta")
    departure_harbor: str = Field(default="Nagapattinam", example="Nagapattinam")
    target_zone_id: str = Field(default="PFZ-BAY-01", example="PFZ-BAY-01")
    estimated_hours: float = Field(default=6.0, example=6.0)
    registered_by: Optional[str] = Field(default=None, example="+919876543210")


class SMSWebhookPayload(BaseModel):
    From: str
    Body: str


class NearestPFZResponse(BaseModel):
    zone: dict
    distance_km: float
    distance_nm: float
    bearing_deg: float


class TripStatus(BaseModel):
    friend_phone: str
    friend_name: str
    status: str
    bearing: float
    distance_km: float
    estimated_position: Optional[dict] = None
