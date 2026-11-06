import math
import pytest
from config.errors import DomainError
from plaza.movement import position_at, trajectory_to
from plaza.types import Point, Trajectory


def test_position_at_interpolates_server_time():
    t = Trajectory(Point(0,0),Point(120,0),0,1000,1)
    assert position_at(t,500) == Point(60,0)
    assert position_at(t,2000) == t.target
    assert position_at(t,-100) == t.start


@pytest.mark.parametrize("value", [math.nan,math.inf,-math.inf,True])
def test_untrusted_nonfinite_target_is_refused(value):
    with pytest.raises(DomainError):
        trajectory_to(Point(0,0),Point(value,50),0,1)


def test_target_is_bounded():
    assert trajectory_to(Point(0,0),Point(2000,-50),0,1).target == Point(1000,0)
