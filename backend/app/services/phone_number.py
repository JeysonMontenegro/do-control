def phone_number_candidates(phone_number: str | None) -> set[str]:
    if not phone_number:
        return set()

    raw = phone_number.strip()
    if not raw:
        return set()

    digits = "".join(character for character in raw if character.isdigit())
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
