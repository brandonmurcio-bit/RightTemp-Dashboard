import type {
  Customer,
  CustomerInput,
  CustomerInsert,
  CustomerRow,
} from "./customers.types";

export function mapCustomerRowToCustomer(
  row: CustomerRow,
): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    status: row.status,
    serviceType: row.service_type,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerNumber: row.customer_number,
  };
}

export function mapCustomerInputToInsert(
  input: CustomerInput,
  organizationId: string,
): CustomerInsert {
  return {
    organization_id: organizationId,
    name: input.name,
    email: input.email || null,
    phone: input.phone || null,
    address: input.address || null,
    city: input.city || null,
    state: input.state || null,
    zip: input.zip || null,
    status: input.status,
    service_type: input.serviceType,
    notes: input.notes || null,
  };
}
