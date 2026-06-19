import pytest
# Припустимо, ти маєш функцію validate_file_extension десь в коді
# from.core.utils import validate_file_extension 

# Якщо функції ще немає, цей крок можна пропустити або написати простий тест:
def test_placeholder_validation():
    filename = "test.py"
    assert filename.endswith((".py", ".txt", ".md")) == True

def test_invalid_extension():
    filename = "virus.exe"
    assert filename.endswith((".py", ".txt", ".md")) == False