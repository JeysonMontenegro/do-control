from fastapi import APIRouter

from app.api.routes import (
    appointments,
    attachments,
    auth,
    communication_dispatches,
    communication_templates,
    doctors,
    encounters,
    integrations,
    patients,
    reminder_rules,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(attachments.router, prefix="/attachments", tags=["attachments"])
api_router.include_router(communication_templates.router, prefix="/communication-templates", tags=["communication-templates"])
api_router.include_router(communication_dispatches.router, prefix="/communication-dispatches", tags=["communication-dispatches"])
api_router.include_router(doctors.router, prefix="/doctors", tags=["doctors"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(encounters.router, prefix="/encounters", tags=["encounters"])
api_router.include_router(reminder_rules.router, prefix="/reminder-rules", tags=["reminder-rules"])
