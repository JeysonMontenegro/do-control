from app.models.user import User


def scoped_doctor_ids_for_user(current_user: User) -> set[int] | None:
    role_names = {user_role.role.name for user_role in current_user.roles}
    if "admin" in role_names:
        return None
    if "doctor" in role_names:
        if current_user.doctor_profile is None:
            return set()
        return {current_user.doctor_profile.id}
    if "receptionist" in role_names:
        return {
            assignment.doctor_id
            for assignment in current_user.doctor_staff_assignments
            if assignment.is_active and assignment.assignment_type == "receptionist"
        }
    return set()
