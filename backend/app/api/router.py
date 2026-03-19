from fastapi import APIRouter

from app.api.routes import (
    appointment_review_items,
    appointments,
    attachments,
    auth,
    clinic_settings,
    communication_dispatches,
    communication_templates,
    doctors,
    email_dispatches,
    email_templates,
    encounters,
    integrations,
    patients,
    receptionists,
    reminder_rules,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(clinic_settings.router, prefix="/clinic-settings", tags=["clinic-settings"])
api_router.include_router(appointment_review_items.router, prefix="/appointment-review-items", tags=["appointment-review-items"])
api_router.include_router(attachments.router, prefix="/attachments", tags=["attachments"])
api_router.include_router(communication_templates.router, prefix="/communication-templates", tags=["communication-templates"])
api_router.include_router(communication_dispatches.router, prefix="/communication-dispatches", tags=["communication-dispatches"])
api_router.include_router(email_templates.router, prefix="/email-templates", tags=["email-templates"])
api_router.include_router(email_dispatches.router, prefix="/email-dispatches", tags=["email-dispatches"])
api_router.include_router(doctors.router, prefix="/doctors", tags=["doctors"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(encounters.router, prefix="/encounters", tags=["encounters"])
api_router.include_router(receptionists.router, prefix="/receptionists", tags=["receptionists"])
api_router.include_router(reminder_rules.router, prefix="/reminder-rules", tags=["reminder-rules"])
