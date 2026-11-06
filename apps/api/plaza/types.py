from dataclasses import dataclass


@dataclass(frozen=True)
class Point:
    x: float
    y: float


@dataclass(frozen=True)
class Trajectory:
    start: Point
    target: Point
    started_at_ms: int
    duration_ms: int
    sequence: int
