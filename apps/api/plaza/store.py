"""Atomic shared presence. All keys are isolated from the existing Celery queues."""
import json
from functools import lru_cache
from django.conf import settings
import redis
from config.errors import DomainError

SCRIPT = r'''
local prefix, action, actor, p = ARGV[1], ARGV[2], ARGV[3], cjson.decode(ARGV[4])
local tm = redis.call('TIME')
local now = tonumber(tm[1])*1000 + math.floor(tonumber(tm[2])/1000)
local function rev(room) redis.call('INCR',prefix..'rev:'..room) end
local function prune(room)
  if redis.call('ZREMRANGEBYSCORE',prefix..'room:'..room,'-inf',now)>0 then rev(room) end
end
local function read_member(id)
  local raw=redis.call('GET',prefix..'actor:'..id)
  if not raw then return nil end
  local m=cjson.decode(raw)
  if m.expires_at_ms<=now then return nil end
  return m
end
local function drop(m)
  if m then redis.call('ZREM',prefix..'room:'..m.room_slug,m.member_id); rev(m.room_slug); redis.call('DEL',prefix..'actor:'..m.member_id) end
end
local function save(m)
  m.expires_at_ms=now+60000
  redis.call('SET',prefix..'actor:'..actor,cjson.encode(m),'PX',65000)
  redis.call('ZADD',prefix..'room:'..m.room_slug,m.expires_at_ms,actor)
  rev(m.room_slug)
end
local function out(value) return cjson.encode(value) end
local function err(code) return out({error=code}) end
local current=read_member(actor)
if action=='read' then
  prune(p.room_slug)
  local members={}
  for _,id in ipairs(redis.call('ZRANGE',prefix..'room:'..p.room_slug,0,39)) do
    local m=read_member(id)
    if m and m.room_slug==p.room_slug then table.insert(members,m) end
  end
  return out({members=members,server_time_ms=now,revision=tonumber(redis.call('GET',prefix..'rev:'..p.room_slug) or '0')})
end
if action=='revoke' then
  if current and (not p.session_binding or current.session_binding==p.session_binding) then drop(current) end
  return out({left=true})
end
if action=='join' then
  local key=prefix..'join:'..actor..':'..p.operation_id
  local prior=redis.call('GET',key)
  if prior then
    prior=cjson.decode(prior)
    if prior.fingerprint~=p.fingerprint then return err('idempotency_conflict') end
    if not current or current.lease~=prior.lease then return err('lease_lost') end
    return out({membership=current,server_time_ms=now,replayed=true})
  end
  prune(p.room_slug)
  local count=redis.call('ZCARD',prefix..'room:'..p.room_slug)
  if count>=40 and (not current or current.room_slug~=p.room_slug) then return err('room_full') end
  if current then drop(current) end
  local m={member_id=actor,participant_id=p.participant_id,room_slug=p.room_slug,instance_id=p.instance_id,session_binding=p.session_binding,lease=p.lease,
    bubble_id=cjson.null,trajectory={start=p.spawn,target=p.spawn,started_at_ms=now,duration_ms=0,sequence=0}}
  save(m)
  redis.call('SET',key,out({fingerprint=p.fingerprint,lease=p.lease}),'EX',900)
  return out({membership=m,server_time_ms=now,replayed=false})
end
if not current or current.room_slug~=p.room_slug or current.session_binding~=p.session_binding or current.instance_id~=p.instance_id or current.lease~=p.lease then return err('lease_lost') end
if action=='leave' then drop(current); return out({left=true}) end
if action=='move' or action=='stop' then
  if p.sequence<=current.trajectory.sequence then return err('stale_sequence') end
  if action=='move' then
    local bucket=math.floor(now/1000)
    if current.move_bucket~=bucket then current.move_bucket=bucket; current.move_count=0 end
    if current.move_count>=4 then return err('rate_limited') end
    current.move_count=current.move_count+1
  end
  local tr=current.trajectory
  local t=1
  if tr.duration_ms>0 then t=math.min(1,math.max(0,(now-tr.started_at_ms)/tr.duration_ms)) end
  local start={x=tr.start.x+(tr.target.x-tr.start.x)*t,y=tr.start.y+(tr.target.y-tr.start.y)*t}
  local target=start
  if action=='move' then target={x=math.max(0,math.min(1000,p.target.x)),y=math.max(0,math.min(700,p.target.y))} end
  current.trajectory={start=start,target=target,started_at_ms=now,duration_ms=math.floor(math.sqrt((target.x-start.x)^2+(target.y-start.y)^2)/120*1000),sequence=p.sequence}
elseif action=='attach' then current.bubble_id=p.bubble_id
elseif action~='heartbeat' then return err('invalid_command') end
save(current)
return out({membership=current,server_time_ms=now})
'''

ERRORS = {
    "lease_lost": ("This character is no longer controlled here. Choose a room to join again.", 409),
    "room_full": ("This room has reached 40 people. Choose another city or try again later.", 409),
    "stale_sequence": ("A newer movement was already recorded. Refresh the room.", 409),
    "rate_limited": ("Please slow down before sending another movement.", 429),
    "idempotency_conflict": ("This operation was already used for a different room request.", 409),
}


class RoomStore:
    def __init__(self, redis_client, prefix="pixelvault:plaza:v1:"):
        self.client, self.prefix = redis_client, prefix
        self.script = redis_client.register_script(SCRIPT)

    def run(self, action, actor_id="", **payload):
        try:
            result = json.loads(self.script(args=[self.prefix, action, str(actor_id), json.dumps(payload)]))
        except (redis.RedisError, ValueError, OSError):
            raise DomainError("plaza_unavailable", "The shared room is temporarily unavailable. Your offers are still available in Explore.", 503) from None
        if "error" in result:
            message, status = ERRORS.get(result["error"], ("This room command is unavailable.", 400))
            raise DomainError(result["error"], message, status)
        # Lua's empty table encodes as {}; callers always receive a list.
        if "members" in result and not result["members"]:
            result["members"] = []
        return result


@lru_cache(maxsize=1)
def get_store():
    try:
        client = redis.Redis.from_url(settings.PLAZA_REDIS_URL, decode_responses=True, socket_timeout=2, socket_connect_timeout=2)
    except (ValueError, redis.RedisError):
        raise DomainError("plaza_unavailable", "The shared room service is unavailable. Continue through Explore or try again later.", 503) from None
    return RoomStore(client, settings.PLAZA_REDIS_PREFIX)
