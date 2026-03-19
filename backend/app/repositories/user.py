from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.doctor import Doctor
from app.models.user import ReceptionistDoctorAssignment, Role, User, UserRole
from app.services.phone_number import phone_number_candidates


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        statement = (
            select(User)
            .options(
                selectinload(User.roles).selectinload(UserRole.role),
                selectinload(User.doctor_profile).selectinload(Doctor.phone_numbers),
            )
            .where(User.email == email)
        )
        return self.db.scalar(statement)

    def get_by_phone_number(self, phone_number: str) -> User | None:
        candidates = phone_number_candidates(phone_number)
        if not candidates:
            return None
        statement = (
            select(User)
            .options(
                selectinload(User.roles).selectinload(UserRole.role),
                selectinload(User.receptionist_assignments).selectinload(ReceptionistDoctorAssignment.doctor),
                selectinload(User.doctor_profile).selectinload(Doctor.phone_numbers),
            )
            .where(or_(*(User.phone_number == candidate for candidate in candidates)))
        )
        return self.db.scalar(statement)

    def get(self, user_id: int) -> User | None:
        statement = (
            select(User)
            .options(
                selectinload(User.roles).selectinload(UserRole.role),
                selectinload(User.receptionist_assignments).selectinload(ReceptionistDoctorAssignment.doctor),
                selectinload(User.doctor_profile).selectinload(Doctor.phone_numbers),
            )
            .where(User.id == user_id)
        )
        return self.db.scalar(statement)

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        return user

    def get_role_by_name(self, name: str) -> Role | None:
        return self.db.scalar(select(Role).where(Role.name == name))

    def create_role(self, role: Role) -> Role:
        self.db.add(role)
        self.db.flush()
        return role

    def add_role(self, user_role: UserRole) -> UserRole:
        self.db.add(user_role)
        self.db.flush()
        return user_role

    def add_receptionist_assignment(self, assignment: ReceptionistDoctorAssignment) -> ReceptionistDoctorAssignment:
        self.db.add(assignment)
        self.db.flush()
        return assignment

    def clear_receptionist_assignments(self, user_id: int) -> None:
        user = self.get(user_id)
        if user is None:
            return
        for assignment in list(user.receptionist_assignments):
            self.db.delete(assignment)
        self.db.flush()

    def list_receptionists(self) -> list[User]:
        statement = (
            select(User)
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .options(
                selectinload(User.roles).selectinload(UserRole.role),
                selectinload(User.receptionist_assignments).selectinload(ReceptionistDoctorAssignment.doctor),
            )
            .where(Role.name == "receptionist")
            .order_by(User.last_name, User.first_name)
        )
        return list(self.db.scalars(statement).unique())
