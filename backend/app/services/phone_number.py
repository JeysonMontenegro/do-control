def normalize_phone_number(phone_number: str | None) -> str | None:
    if phone_number is None:
        return None

    digits = "".join(character for character in phone_number if character.isdigit())
    return digits or None


def phone_number_candidates(phone_number: str | None) -> set[str]:
    if not phone_number:
        return set()

    raw = phone_number.strip()
    if not raw:
        return set()

    digits = normalize_phone_number(raw)
    candidates = {raw}

    if digits:
        candidates.add(digits)
        candidates.add(f"+{digits}")
        if digits.startswith("502") and len(digits) > 3:
            local_digits = digits[3:]
            candidates.add(local_digits)
            candidates.add(f"+502{local_digits}")
        elif len(digits) <= 8:
            candidates.add(f"502{digits}")
            candidates.add(f"+502{digits}")

    return {candidate for candidate in candidates if candidate}
