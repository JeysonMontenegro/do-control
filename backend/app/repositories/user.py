from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.doctor import Doctor
from app.models.doctor_staff_assignment import DoctorStaffAssignment
from app.models.user import Role, User, UserRole
from app.models.user_phone_number import UserPhoneNumber
from app.services.phone_number import phone_number_candidates


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _base_options(self):
        return (
            selectinload(User.roles).selectinload(UserRole.role),
            selectinload(User.phone_numbers),
            selectinload(User.doctor_profile).selectinload(Doctor.phone_numbers),
            selectinload(User.doctor_staff_assignments).selectinload(DoctorStaffAssignment.doctor),
        )

    def get_by_email(self, email: str) -> User | None:
        statement = select(User).options(*self._base_options()).where(User.email == email)
        return self.db.scalar(statement)

    def get_by_phone_number(self, phone_number: str) -> User | None:
        candidates = phone_number_candidates(phone_number)
        if not candidates:
            return None

        normalized_statement = (
            select(User)
            .join(UserPhoneNumber, UserPhoneNumber.user_id == User.id)
            .options(*self._base_options())
            .where(or_(*(UserPhoneNumber.phone_number == candidate for candidate in candidates)))
            .order_by(User.is_active.desc(), UserPhoneNumber.is_primary.desc(), User.id.desc())
        )
        return self.db.scalars(normalized_statement).first()

    def get(self, user_id: int) -> User | None:
        statement = select(User).options(*self._base_options()).where(User.id == user_id)
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

    def get_phone_number_for_user(self, user_id: int, phone_number: str) -> UserPhoneNumber | None:
        candidates = phone_number_candidates(phone_number)
        if not candidates:
            return None
        statement = select(UserPhoneNumber).where(
            UserPhoneNumber.user_id == user_id,
            or_(*(UserPhoneNumber.phone_number == candidate for candidate in candidates)),
        )
        return self.db.scalar(statement)

    def add_phone_number(self, phone_number: UserPhoneNumber) -> UserPhoneNumber:
        self.db.add(phone_number)
        self.db.flush()
        return phone_number

    def unset_primary_phone_numbers(self, user_id: int) -> None:
        phone_numbers = list(
            self.db.scalars(
                select(UserPhoneNumber).where(
                    UserPhoneNumber.user_id == user_id,
                    UserPhoneNumber.is_primary.is_(True),
                )
            )
        )
        for phone_number in phone_numbers:
            phone_number.is_primary = False

    def sync_primary_phone_number(
        self,
        user_id: int,
        phone_number: str | None,
        *,
        phone_type: str = "mobile",
        is_verified: bool = False,
        can_talk_to_bot: bool = True,
    ) -> UserPhoneNumber | None:
        self.unset_primary_phone_numbers(user_id)
        if not phone_number:
            return None
        existing_phone = self.get_phone_number_for_user(user_id, phone_number)
        if existing_phone is not None:
            existing_phone.is_primary = True
            existing_phone.phone_type = phone_type
            existing_phone.is_verified = is_verified
            existing_phone.can_talk_to_bot = can_talk_to_bot
            return existing_phone
        return self.add_phone_number(
            UserPhoneNumber(
                user_id=user_id,
                phone_number=phone_number,
                phone_type=phone_type,
                is_primary=True,
                is_verified=is_verified,
                can_talk_to_bot=can_talk_to_bot,
            )
        )

    def add_doctor_staff_assignment(self, assignment: DoctorStaffAssignment) -> DoctorStaffAssignment:
        self.db.add(assignment)
        self.db.flush()
        return assignment

    def clear_doctor_staff_assignments(self, user_id: int, assignment_type: str | None = None) -> None:
        user = self.get(user_id)
        if user is None:
            return
        for assignment in list(user.doctor_staff_assignments):
            if assignment_type is not None and assignment.assignment_type != assignment_type:
                continue
            self.db.delete(assignment)
        self.db.flush()

    def list_receptionists(self) -> list[User]:
        statement = (
            select(User)
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .options(*self._base_options())
            .where(Role.name == "receptionist")
            .order_by(User.last_name, User.first_name)
        )
        return list(self.db.scalars(statement).unique())
