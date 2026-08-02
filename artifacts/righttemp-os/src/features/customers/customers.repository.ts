import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import {
  mapCustomerInputToInsert,
  mapCustomerRowToCustomer,
} from "./customers.mappers";
import type { Customer, CustomerInput, CustomerRow } from "./customers.types";

const customerSelect = `
  id,
  organization_id,
  name,
  email,
  phone,
  address,
  city,
  state,
  zip,
  status,
  service_type,
  notes,
  created_at,
  updated_at
`;

function normalizeError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}

export async function getCustomers(): Promise<Customer[]> {
  try {
    const organizationId = await getCurrentOrganizationId();

    const { data, error } = await supabase
      .from("customers")
      .select(customerSelect)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Unable to load customers: ${error.message}`);
    }

    return ((data ?? []) as CustomerRow[]).map(mapCustomerRowToCustomer);
  } catch (error) {
    throw normalizeError(error, "Unable to load customers");
  }
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  try {
    const organizationId = await getCurrentOrganizationId();

    const insertData = mapCustomerInputToInsert(input, organizationId);

    const { data, error } = await supabase
      .from("customers")
      .insert(insertData)
      .select(customerSelect)
      .single();

    if (error) {
      throw new Error(`Unable to create customer: ${error.message}`);
    }

    return mapCustomerRowToCustomer(data as CustomerRow);
  } catch (error) {
    throw normalizeError(error, "Unable to create customer");
  }
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase
    .from("customers")
    .select(customerSelect)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load customer: ${error.message}`);
  }

  return data ? mapCustomerRowToCustomer(data as CustomerRow) : null;
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
): Promise<Customer> {
  const organizationId = await getCurrentOrganizationId();
  const { organization_id: _organizationId, ...updateData } =
    mapCustomerInputToInsert(input, organizationId);

  const { data, error } = await supabase
    .from("customers")
    .update(updateData)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select(customerSelect)
    .single();

  if (error) {
    throw new Error(`Unable to update customer: ${error.message}`);
  }

  return mapCustomerRowToCustomer(data as CustomerRow);
}

export async function deleteCustomer(id: string): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Unable to delete customer: ${error.message}`);
  }
}
