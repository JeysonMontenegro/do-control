from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.models.doctor_clinic import DoctorClinic
from app.models.doctor_phone_number import DoctorPhoneNumber
from app.models.doctor_staff_assignment import DoctorStaffAssignment
from app.models.user import Role, User, UserRole
from app.repositories.doctor import DoctorRepository
from app.repositories.user import UserRepository
from app.schemas.doctor import AssignedReceptionistRead, DoctorCreate, DoctorRead, DoctorUpdate
from app.services.audit import create_audit_log
from app.services.doctor_scope import scoped_doctor_ids_for_user
from app.services.email_service import EmailService
from app.services.errors import NotFoundError, ValidationError
from app.services.security import hash_password
from app.services.service_utils import sync_doctor_primary_phone


class DoctorService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = DoctorRepository(db)
        self.user_repository = UserRepository(db)

    @staticmethod
    def _role_names(user) -> set[str]:
        return {user_role.role.name for user_role in user.roles}

    def list_doctors(self, query: str | None = None, current_user=None) -> list[Doctor]:
        if current_user is None:
            return self.repository.list(query=query)

        role_names = self._role_names(current_user)
        if "admin" in role_names:
            return self.repository.list(query=query)
        if "doctor" in role_names:
            doctors = self.repository.list_for_linked_user(current_user.id)
            return self._apply_query_filter(doctors, query)
        if "receptionist" in role_names:
            doctors = self.repository.list_for_receptionist_user(current_user.id)
            return self._apply_query_filter(doctors, query)
        return []

    def get_doctor(self, doctor_id: int, current_user=None) -> Doctor:
        doctor = self.repository.get(doctor_id)
        if doctor is None:
            raise NotFoundError("Doctor not found.")
        if current_user is not None:
            accessible_ids = self.accessible_doctor_ids(current_user)
            if accessible_ids is not None and doctor.id not in accessible_ids:
                raise NotFoundError("Doctor not found.")
        return doctor

    def serialize_doctor(self, doctor: Doctor) -> DoctorRead:
        return DoctorRead(
            id=doctor.id,
            first_name=doctor.first_name,
            last_name=doctor.last_name,
            gender=doctor.gender,
            doctor_title=doctor.doctor_title,
            date_of_birth=doctor.date_of_birth,
            license_number=doctor.license_number,
            specialty=doctor.specialty,
            linked_user_id=doctor.linked_user_id,
            linked_user_email=doctor.linked_user.email if doctor.linked_user is not None else None,
            is_active=doctor.is_active,
            created_at=doctor.created_at,
            updated_at=doctor.updated_at,
            clinics=doctor.clinics,
            phone_numbers=doctor.phone_numbers,
            assigned_receptionists=[
                AssignedReceptionistRead(
                    id=assignment.staff_user.id,
                    first_name=assignment.staff_user.first_name,
                    last_name=assignment.staff_user.last_name,
                    email=assignment.staff_user.email,
                    gender=assignment.staff_user.gender,
                    phone_number=assignment.staff_user.primary_phone_number,
                    is_active=assignment.staff_user.is_active,
                )
                for assignment in doctor.staff_assignments
                if assignment.is_active and assignment.assignment_type == "receptionist" and assignment.staff_user is not None
            ],
        )

    def _apply_query_filter(self, doctors: list[Doctor], query: str | None) -> list[Doctor]:
        if not query:
            return doctors
        lowered = query.lower()
        return [
            doctor
            for doctor in doctors
            if lowered in doctor.first_name.lower()
            or lowered in doctor.last_name.lower()
            or lowered in (doctor.specialty or "").lower()
            or lowered in (doctor.license_number or "").lower()
            or any(lowered in phone.phone_number.lower() for phone in doctor.phone_numbers)
        ]

    def accessible_doctor_ids(self, current_user) -> set[int] | None:
        return scoped_doctor_ids_for_user(current_user)

    def create_doctor(self, payload: DoctorCreate) -> Doctor:
        data = payload.model_dump()
        clinics_payload = data.pop("clinics", [])
        primary_phone = data.pop("primary_phone")
        phone_channel_type = data.pop("phone_channel_type", "whatsapp")
        user_email = data.pop("user_email")
        user_password = data.pop("user_password")
        first_name = data.pop("first_name")
        last_name = data.pop("last_name")
        gender = data.pop("gender", None)

        if self.user_repository.get_by_email(user_email) is not None:
            raise ValidationError("A user with that email already exists.")
        existing_phone_user = self.user_repository.get_by_phone_number(primary_phone)
        if existing_phone_user is not None:
            raise ValidationError("A user with that phone number already exists.")
        if self.repository.phone_number_in_use(primary_phone):
            raise ValidationError("A doctor with that phone number already exists.")

        doctor_role = self.user_repository.get_role_by_name("doctor")
        if doctor_role is None:
            doctor_role = self.user_repository.create_role(Role(name="doctor", description="Doctor"))
        user = self.user_repository.create(
            User(
                email=user_email,
                password_hash=hash_password(user_password),
                first_name=first_name,
                last_name=last_name,
                gender=gender,
                is_active=True,
            )
        )
        self.user_repository.sync_primary_phone_number(
            user.id,
            primary_phone,
            phone_type="mobile",
            is_verified=False,
            can_talk_to_bot=True,
        )
        self.user_repository.add_role(UserRole(user_id=user.id, role_id=doctor_role.id))

        doctor = self.repository.create(Doctor(**data, linked_user_id=user.id))
        if clinics_payload:
            self.repository.replace_clinics(doctor, [DoctorClinic(**clinic_data) for clinic_data in clinics_payload])
        sync_doctor_primary_phone(
            doctor_repository=self.repository,
            user=user,
            phone_number=primary_phone,
            channel_type=phone_channel_type,
        )
        create_audit_log(
            self.db,
            action="create",
            entity_type="doctor",
            entity_id=str(doctor.id),
            after_data={"name": f"{user.first_name} {user.last_name}"},
        )
        self.db.commit()
        self.db.refresh(doctor)
        EmailService(self.db).send_welcome_email(doctor.linked_user, temporary_password=user_password)
        return doctor

    def update_doctor(self, doctor_id: int, payload: DoctorUpdate) -> Doctor:
        doctor = self.repository.get(doctor_id)
        if doctor is None:
            raise NotFoundError("Doctor not found.")
        if doctor.linked_user is None:
            raise ValidationError("Doctor must have a linked user.")

        updates = payload.model_dump(exclude_unset=True)
        clinics_payload = updates.pop("clinics", None) if "clinics" in updates else None
        primary_phone = updates.pop("primary_phone", None) if "primary_phone" in updates else None
        user_password = updates.pop("user_password", None) if "user_password" in updates else None
        first_name = updates.pop("first_name", None) if "first_name" in updates else None
        last_name = updates.pop("last_name", None) if "last_name" in updates else None
        gender = updates.pop("gender", None) if "gender" in updates else None
        is_active = updates.pop("is_active", None) if "is_active" in updates else None

        for field, value in updates.items():
            setattr(doctor, field, value)

        if clinics_payload is not None:
            self.repository.replace_clinics(doctor, [DoctorClinic(**clinic_data) for clinic_data in clinics_payload])

        if primary_phone is not None:
            existing_phone_user = self.user_repository.get_by_phone_number(primary_phone)
            if existing_phone_user is not None and existing_phone_user.id != doctor.linked_user_id:
                raise ValidationError("A user with that phone number already exists.")
            if self.repository.phone_number_in_use(primary_phone, exclude_linked_user_id=doctor.linked_user_id):
                raise ValidationError("A doctor with that phone number already exists.")
            self.user_repository.sync_primary_phone_number(
                doctor.linked_user.id,
                primary_phone,
                phone_type="mobile",
                is_verified=False,
                can_talk_to_bot=True,
            )
            sync_doctor_primary_phone(
                doctor_repository=self.repository,
                user=doctor.linked_user,
                phone_number=primary_phone,
            )

        if first_name is not None:
            doctor.linked_user.first_name = first_name
        if last_name is not None:
            doctor.linked_user.last_name = last_name
        if gender is not None:
            doctor.linked_user.gender = gender
        if is_active is not None:
            doctor.linked_user.is_active = is_active
        if user_password:
            doctor.linked_user.password_hash = hash_password(user_password)

        create_audit_log(
            self.db,
            action="update",
            entity_type="doctor",
            entity_id=str(doctor.id),
            after_data={"name": f"{doctor.first_name} {doctor.last_name}"},
        )
        self.db.commit()
        self.db.refresh(doctor)
        return doctor
