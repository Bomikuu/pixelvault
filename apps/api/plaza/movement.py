import math
from .types import Point, Trajectory
from config.errors import DomainError


def position_at(trajectory, now_ms):
    ratio = min(1, max(0, (now_ms - trajectory.started_at_ms) / max(1, trajectory.duration_ms)))
    if not trajectory.duration_ms:
        ratio = 1
    return Point(trajectory.start.x + (trajectory.target.x - trajectory.start.x) * ratio,
                 trajectory.start.y + (trajectory.target.y - trajectory.start.y) * ratio)


def trajectory_to(current, target, now_ms, sequence):
    if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in (target.x, target.y)):
        raise DomainError("invalid_target", "Choose a finite position inside the room.")
    target = Point(min(1000, max(0, target.x)), min(700, max(0, target.y)))
    return Trajectory(current, target, now_ms, round(math.hypot(target.x-current.x, target.y-current.y) / 120 * 1000), sequence)
