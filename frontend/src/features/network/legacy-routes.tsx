import { Navigate, useLocation, useParams } from "react-router";

export type NetworkPageId = "overview" | "graph";

export function networkLegacyLocation(
  pageId: NetworkPageId,
  customerId: string | undefined,
  search: string,
  hash: string,
) {
  if (customerId && (!Number.isInteger(Number(customerId)) || Number(customerId) <= 0)) {
    return null;
  }

  const pathname = customerId
    ? `/customer/${encodeURIComponent(customerId)}/plugins/network/${pageId}`
    : `/plugins/network/${pageId}`;

  return { pathname, search, hash };
}

export function LegacyNetworkRedirect({
  pageId,
  customerScoped = false,
}: {
  pageId: NetworkPageId;
  customerScoped?: boolean;
}) {
  const { customerId } = useParams();
  const { search, hash } = useLocation();
  const target = networkLegacyLocation(
    pageId,
    customerScoped ? customerId : undefined,
    search,
    hash,
  );

  if (!target) {
    return <Navigate to={{ pathname: "/", search, hash }} replace />;
  }

  return <Navigate to={target} replace />;
}