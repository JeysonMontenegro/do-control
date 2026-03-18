from sqlalchemy.orm import Session

from app.models.user import ReceptionistDoctorAssignment, User, UserRole
from app.repositories.doctor import DoctorRepository
from app.repositories.user import UserRepository
from app.schemas.receptionist import ReceptionistCreate, ReceptionistRead, ReceptionistDoctorRead, ReceptionistUpdate
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError, ValidationError
from app.services.security import hash_password


class ReceptionistService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.user_repository = UserRepository(db)
        self.doctor_repository = DoctorRepository(db)

    def list_receptionists(self) -> list[ReceptionistRead]:
        return [self._serialize_receptionist(user) for user in self.user_repository.list_receptionists()]

    def _serialize_receptionist(self, user: User) -> ReceptionistRead:
        assigned_doctors = [
            ReceptionistDoctorRead(
                id=assignment.doctor.id,
                first_name=assignment.doctor.first_name,
                last_name=assignment.doctor.last_name,
                specialty=assignment.doctor.specialty,
            )
            for assignment in user.receptionist_assignments
            if assignment.doctor is not None
        ]
        return ReceptionistRead(
            id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            gender=user.gender,
            phone_number=user.phone_number,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
            assigned_doctors=assigned_doctors,
        )

    def create_receptionist(self, payload: ReceptionistCreate) -> ReceptionistRead:
        if self.user_repository.get_by_email(payload.email) is not None:
            raise ValidationError("A user with that email already exists.")

        receptionist_role = self.user_repository.get_role_by_name("receptionist")
        if receptionist_role is None:
            raise ValidationError("Receptionist role not found.")

        doctors = []
        for doctor_id in payload.doctor_ids:
            doctor = self.doctor_repository.get(doctor_id)
            if doctor is None:
                raise NotFoundError(f"Doctor {doctor_id} not found.")
            doctors.append(doctor)

        user = self.user_repository.create(
            User(
                email=str(payload.email),
                password_hash=hash_password(payload.password),
                first_name=payload.first_name,
                last_name=payload.last_name,
                gender=payload.gender,
                phone_number=payload.phone_number,
                is_active=True,
            )
        )
        self.user_repository.add_role(UserRole(user_id=user.id, role_id=receptionist_role.id))
        for doctor in doctors:
            self.user_repository.add_receptionist_assignment(
                ReceptionistDoctorAssignment(user_id=user.id, doctor_id=doctor.id)
            )

        create_audit_log(
            self.db,
            action="create",
            entity_type="receptionist",
            entity_id=str(user.id),
            after_data={"doctor_ids": payload.doctor_ids},
        )
        self.db.commit()
        refreshed = self.user_repository.get(user.id)
        if refreshed is None:
            raise NotFoundError("Receptionist not found after creation.")
        return self._serialize_receptionist(refreshed)

    def update_receptionist(self, receptionist_id: int, payload: ReceptionistUpdate) -> ReceptionistRead:
        user = self.user_repository.get(receptionist_id)
        if user is None:
            raise NotFoundError("Receptionist not found.")

        updates = payload.model_dump(exclude_unset=True)
        doctor_ids = updates.pop("doctor_ids", None)
        password = updates.pop("password", None)

        for field, value in updates.items():
            setattr(user, field, value)

        if password:
            user.password_hash = hash_password(password)

        if doctor_ids is not None:
            doctors = []
            for doctor_id in doctor_ids:
                doctor = self.doctor_repository.get(doctor_id)
                if doctor is None:
                    raise NotFoundError(f"Doctor {doctor_id} not found.")
                doctors.append(doctor)
            self.user_repository.clear_receptionist_assignments(user.id)
            for doctor in doctors:
                self.user_repository.add_receptionist_assignment(
                    ReceptionistDoctorAssignment(user_id=user.id, doctor_id=doctor.id)
                )

        create_audit_log(
            self.db,
            action="update",
            entity_type="receptionist",
            entity_id=str(user.id),
            after_data={"doctor_ids": doctor_ids},
        )
        self.db.commit()
        refreshed = self.user_repository.get(user.id)
        if refreshed is None:
            raise NotFoundError("Receptionist not found after update.")
        return self._serialize_receptionist(refreshed)
