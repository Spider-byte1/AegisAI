import bcrypt

# bcrypt only looks at the first 72 bytes of a password; the API schema rejects
# anything longer so two different long passwords can never hash identically.
MAX_PASSWORD_BYTES = 72

# Used to burn the same CPU time when a login email doesn't exist, so response
# time doesn't reveal which emails are registered.
_DUMMY_HASH = bcrypt.hashpw(b"dummy-password", bcrypt.gensalt()).decode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    try:
        target = (hashed_password or _DUMMY_HASH).encode("utf-8")
        ok = bcrypt.checkpw(plain_password.encode("utf-8"), target)
    except ValueError:
        return False
    return ok and hashed_password is not None
