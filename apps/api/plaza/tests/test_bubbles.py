import pytest
from config.errors import DomainError
from plaza.bubbles import normalize_body


def test_normalize_body_is_plain_unicode_text():
    assert normalize_body("  Hello\nthere  ") == "Hello there"
    assert normalize_body("<b>Hello</b>") == "<b>Hello</b>"
    assert len(normalize_body("😀"*120)) == 120
    with pytest.raises(DomainError):
        normalize_body("😀"*121)


@pytest.mark.parametrize("text", ["", "  ", "hello\x00world", "hello\tworld"])
def test_blank_or_control_text_is_refused(text):
    with pytest.raises(DomainError):
        normalize_body(text)
