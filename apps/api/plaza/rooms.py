from community.locations import coarse_area
from config.errors import DomainError

ROOMS = {
    f"{code}-01": {"slug": f"{code}-01", "name": f"{name} · Room 01", "area": coarse_area(area_code=code), "capacity": 40, "width": 1000, "height": 700}
    for code, name in (("quezon-city", "Quezon City"), ("manila", "Manila"), ("makati", "Makati"), ("pasig", "Pasig"))
}


def room_for(slug):
    if slug not in ROOMS:
        raise DomainError("unknown_room", "Choose one of the available city rooms.", 404)
    return ROOMS[slug]
