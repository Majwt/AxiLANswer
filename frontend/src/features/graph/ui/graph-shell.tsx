import Component from "./graph-page";
import { Navigate, useParams } from "react-router";

export function GraphShell() {
  const { customerId: customerIdParam } = useParams();
  const customerId = customerIdParam == null ? null : Number(customerIdParam);

  if (customerId != null && (!Number.isInteger(customerId) || customerId <= 0)) {
    return <Navigate to="/graph" replace />;
  }

  return <Component />;
}
