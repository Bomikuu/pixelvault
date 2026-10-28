import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useSession } from "./session";
import { Loading, Empty } from "../components";
export function RequireMember({
  children,
  staff = false,
}: {
  children: ReactNode;
  staff?: boolean;
}) {
  const { session, loading } = useSession();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!session?.member)
    return (
      <Navigate
        to="/sign-in"
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
        }}
        replace
      />
    );
  if (staff && !session.member.is_staff)
    return (
      <Empty title="This workspace is restricted">
        You need a staff account and the relevant purpose grants to access
        administration.
      </Empty>
    );
  return children;
}
