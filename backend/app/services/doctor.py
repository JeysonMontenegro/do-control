from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.models.doctor_phone_number import DoctorPhoneNumber
from app.models.user import User, UserRole
from app.repositories.clinic_setting import ClinicSettingRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.user import UserRepository
from app.schemas.doctor import AssignedReceptionistRead, DoctorCreate, DoctorRead, DoctorUpdate
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError, ValidationError
from app.services.security import hash_password


class DoctorService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = DoctorRepository(db)
        self.user_repository = UserRepository(db)
        self.clinic_setting_repository = ClinicSettingRepository(db)

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
            if len(doctors) > 1 and not self._allow_multi_doctor_visibility():
                return []
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
            if self._is_receptionist_with_hidden_multi_doctor_scope(current_user):
                raise NotFoundError("Doctor not found.")
        return doctor

    def serialize_doctor(self, doctor: Doctor) -> DoctorRead:
        return DoctorRead(
            id=doctor.id,
            first_name=doctor.first_name,
            last_name=doctor.last_name,
            gender=doctor.gender,
            license_number=doctor.license_number,
            specialty=doctor.specialty,
            linked_user_id=doctor.linked_user_id,
            linked_user_email=doctor.linked_user.email if doctor.linked_user is not None else None,
            is_active=doctor.is_active,
            created_at=doctor.created_at,
            updated_at=doctor.updated_at,
            phone_numbers=doctor.phone_numbers,
            assigned_receptionists=[
                AssignedReceptionistRead(
                    id=assignment.user.id,
                    first_name=assignment.user.first_name,
                    last_name=assignment.user.last_name,
                    email=assignment.user.email,
                    gender=assignment.user.gender,
                    phone_number=assignment.user.phone_number,
                    is_active=assignment.user.is_active,
                )
                for assignment in doctor.receptionist_assignments
                if assignment.user is not None
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
        role_names = self._role_names(current_user)
        if "admin" in role_names:
            return None
        if "doctor" in role_names:
            return {doctor.id for doctor in self.repository.list_for_linked_user(current_user.id)}
        if "receptionist" in role_names:
            return {doctor.id for doctor in self.repository.list_for_receptionist_user(current_user.id)}
        return set()

    def _allow_multi_doctor_visibility(self) -> bool:
        setting = self.clinic_setting_repository.get_singleton()
        return bool(setting and setting.allow_multi_doctor_visibility)

    def _is_receptionist_with_hidden_multi_doctor_scope(self, current_user) -> bool:
        role_names = self._role_names(current_user)
        if "receptionist" not in role_names or "admin" in role_names:
            return False
        doctors = self.repository.list_for_receptionist_user(current_user.id)
        return len(doctors) > 1 and not self._allow_multi_doctor_visibility()

    def create_doctor(self, payload: DoctorCreate) -> Doctor:
        data = payload.model_dump()
        primary_phone = data.pop("primary_phone", None)
        phone_channel_type = data.pop("phone_channel_type", "whatsapp")
        user_email = data.pop("user_email", None)
        user_password = data.pop("user_password", None)
        doctor = self.repository.create(Doctor(**data))
        if primary_phone:
            self.repository.add_phone_number(
                DoctorPhoneNumber(
                    doctor_id=doctor.id,
                    phone_number=primary_phone,
                    is_primary=True,
                    is_active=True,
                    channel_type=phone_channel_type,
                )
            )
        if user_email:
            if not user_password:
                raise ValidationError("Doctor login password is required when doctor login email is provided.")
            if self.user_repository.get_by_email(user_email) is not None:
                raise ValidationError("A user with that email already exists.")
            doctor_role = self.user_repository.get_role_by_name("doctor")
            if doctor_role is None:
                raise ValidationError("Doctor role not found.")
            user = self.user_repository.create(
                User(
                    email=user_email,
                    password_hash=hash_password(user_password),
                    first_name=doctor.first_name,
                    last_name=doctor.last_name,
                    gender=doctor.gender,
                    phone_number=primary_phone,
                    is_active=True,
                )
            )
            self.user_repository.add_role(UserRole(user_id=user.id, role_id=doctor_role.id))
            doctor.linked_user_id = user.id
        create_audit_log(
            self.db,
            action="create",
            entity_type="doctor",
            entity_id=str(doctor.id),
            after_data={"name": f"{doctor.first_name} {doctor.last_name}"},
        )
        self.db.commit()
        self.db.refresh(doctor)
        return doctor

    def update_doctor(self, doctor_id: int, payload: DoctorUpdate) -> Doctor:
        doctor = self.repository.get(doctor_id)
        if doctor is None:
            raise NotFoundError("Doctor not found.")

        updates = payload.model_dump(exclude_unset=True)
        primary_phone = updates.pop("primary_phone", None) if "primary_phone" in updates else None
        user_password = updates.pop("user_password", None) if "user_password" in updates else None

        for field, value in updates.items():
            setattr(doctor, field, value)

        if primary_phone is not None:
            self.repository.deactivate_primary_phone_numbers(doctor.id)
            self.repository.add_phone_number(
                DoctorPhoneNumber(
                    doctor_id=doctor.id,
                    phone_number=primary_phone,
                    is_primary=True,
                    is_active=True,
                    channel_type="whatsapp",
                )
            )

        if doctor.linked_user is not None:
            doctor.linked_user.first_name = doctor.first_name
            doctor.linked_user.last_name = doctor.last_name
            doctor.linked_user.gender = doctor.gender
            doctor.linked_user.is_active = doctor.is_active
            if primary_phone is not None:
                doctor.linked_user.phone_number = primary_phone
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
