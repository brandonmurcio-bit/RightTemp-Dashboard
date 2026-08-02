import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import {
  mapCustomerInputToInsert,
  mapCustomerRowToCustomer,
} from "./customers.mappers";
import type {
  Customer,
  CustomerInput,
  CustomerRow,
} from "./customers.types";

function normalizeError(
  error: unknown,
  fallbackMessage: string,
): Error {
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
      .select(
        `
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
        `,
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(
        `Unable to load customers: ${error.message}`,
      );
    }

    return ((data ?? []) as CustomerRow[]).map(
      mapCustomerRowToCustomer,
    );
  } catch (error) {
    throw normalizeError(
      error,
      "Unable to load customers",
    );
  }
}

export async function createCustomer(
  input: CustomerInput,
): Promise<Customer> {
  try {
    const organizationId =
      await getCurrentOrganizationId();

    const insertData = mapCustomerInputToInsert(
      input,
      organizationId,
    );

    const { data, error } = await supabase
      .from("customers")
      .insert(insertData)
      .select(
        `
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
        `,
      )
      .single();

    if (error) {
      throw new Error(
        `Unable to create customer: ${error.message}`,
      );
    }

    return mapCustomerRowToCustomer(
      data as CustomerRow,
    );
  } catch (error) {
    throw normalizeError(
      error,
      "Unable to create customer",
    );
  }
}