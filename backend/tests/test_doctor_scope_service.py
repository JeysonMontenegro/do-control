import unittest
from types import SimpleNamespace

from app.services.doctor_scope import scoped_doctor_ids_for_user


def make_user(*role_names: str, doctor_profile_id: int | None = None, assignments: list[tuple[int, str, bool]] | None = None):
    return SimpleNamespace(
        roles=[SimpleNamespace(role=SimpleNamespace(name=role_name)) for role_name in role_names],
        doctor_profile=SimpleNamespace(id=doctor_profile_id) if doctor_profile_id is not None else None,
        doctor_staff_assignments=[
            SimpleNamespace(doctor_id=doctor_id, assignment_type=assignment_type, is_active=is_active)
            for doctor_id, assignment_type, is_active in (assignments or [])
        ],
    )


class ScopedDoctorIdsForUserTests(unittest.TestCase):
    def test_admin_has_unscoped_access(self) -> None:
        result = scoped_doctor_ids_for_user(make_user("admin"))
        self.assertIsNone(result)

    def test_doctor_scope_uses_linked_doctor_profile(self) -> None:
        result = scoped_doctor_ids_for_user(make_user("doctor", doctor_profile_id=7))
        self.assertEqual(result, {7})

    def test_doctor_without_profile_has_empty_scope(self) -> None:
        result = scoped_doctor_ids_for_user(make_user("doctor"))
        self.assertEqual(result, set())

    def test_receptionist_scope_uses_active_receptionist_assignments_only(self) -> None:
        result = scoped_doctor_ids_for_user(
            make_user(
                "receptionist",
                assignments=[
                    (3, "receptionist", True),
                    (5, "billing", True),
                    (8, "receptionist", False),
                    (11, "receptionist", True),
                ],
            )
        )
        self.assertEqual(result, {3, 11})


if __name__ == "__main__":
    unittest.main()
