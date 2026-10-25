from app.core.security import hash_password, verify_password


def test_verify_correct_password() -> None:
    password = "123"
    password_hash = hash_password(password)
    assert verify_password(password, password_hash)


def test_verify_wrong_password() -> None:
    password = "123"
    password_hash = hash_password(password)
    assert not verify_password("1234", password_hash)


def test_same_password_different_hashes() -> None:
    password = "123"
    password_hash = hash_password(password)
    password_hash_another = hash_password(password)
    assert password_hash_another != password_hash
