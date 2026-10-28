from config.errors import DomainError

# Synthetic area centroids, never a member residence. A licensed live map/geocoder is not configured.
AREAS = {
    "Quezon City": {
        "code": "quezon-city",
        "name": "Quezon City",
        "latitude": 14.6760,
        "longitude": 121.0437,
    },
    "Makati": {"code": "makati", "name": "Makati", "latitude": 14.5547, "longitude": 121.0244},
    "Manila": {"code": "manila", "name": "Manila", "latitude": 14.5995, "longitude": 120.9842},
    "Pasig": {"code": "pasig", "name": "Pasig", "latitude": 14.5764, "longitude": 121.0851},
}


def coarse_area(*, area_code):
    for area in AREAS.values():
        if area_code in (area["code"], area["name"]):
            return {**area, "approximate": True, "source": "synthetic-area-centroid"}
    raise DomainError(
        "unknown_area", "Select a supported city; precise coordinates are not accepted."
    )
