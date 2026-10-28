import { useRouteError } from "react-router-dom";
import { ActionLink, ErrorNotice, PageHeading } from "../components";
export function ErrorPage() {
  const error = useRouteError();
  return (
    <main className="main-content">
      <PageHeading
        title="Let’s get you back on track."
        description="This page could not be displayed. Your financial records are maintained by the server."
      />
      <ErrorNotice error={error} />
      <ActionLink to="/explore">Return to the community</ActionLink>
    </main>
  );
}
