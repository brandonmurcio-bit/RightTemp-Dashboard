import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import {
  mapLeadInputToInsert,
  mapLeadRowToLead,
} from "./leads.mappers";
import type { Lead, LeadInput, LeadRow } from "./leads.types";

const leadSelect = `
  id,
  organization_id,
  name,
  email,
  phone,
  status,
  source,
  service_type,
  created_at
`;

function normalizeError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}

export async function getLeads(): Promise<Lead[]> {
  try {
    const organizationId = await getCurrentOrganizationId();

    const { data, error } = await supabase
      .from("leads")
      .select(leadSelect)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Unable to load leads: ${error.message}`);
    }

    return ((data ?? []) as LeadRow[]).map(mapLeadRowToLead);
  } catch (error) {
    throw normalizeError(error, "Unable to load leads");
  }
}

export async function getLead(id: string): Promise<Lead | null> {
  try {
    const organizationId = await getCurrentOrganizationId();

    const { data, error } = await supabase
      .from("leads")
      .select(leadSelect)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to load lead: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapLeadRowToLead(data as LeadRow);
  } catch (error) {
    throw normalizeError(error, "Unable to load lead");
  }
}

export async function createLead(input: LeadInput): Promise<Lead> {
  try {
    const organizationId = await getCurrentOrganizationId();
    const insertData = mapLeadInputToInsert(input, organizationId);

    const { data, error } = await supabase
      .from("leads")
      .insert(insertData)
      .select(leadSelect)
      .single();

    if (error) {
      throw new Error(`Unable to create lead: ${error.message}`);
    }

    return mapLeadRowToLead(data as LeadRow);
  } catch (error) {
    throw normalizeError(error, "Unable to create lead");
  }
}

export async function updateLead(
  id: string,
  input: LeadInput,
): Promise<Lead> {
  try {
    const organizationId = await getCurrentOrganizationId();
    const mappedInput = mapLeadInputToInsert(input, organizationId);

    const {
      organization_id: _organizationId,
      ...updateData
    } = mappedInput;

    const { data, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select(leadSelect)
      .single();

    if (error) {
      throw new Error(`Unable to update lead: ${error.message}`);
    }

    return mapLeadRowToLead(data as LeadRow);
  } catch (error) {
    throw normalizeError(error, "Unable to update lead");
  }
}

export async function deleteLead(id: string): Promise<void> {
  try {
    const organizationId = await getCurrentOrganizationId();

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      throw new Error(`Unable to delete lead: ${error.message}`);
    }
  } catch (error) {
    throw normalizeError(error, "Unable to delete lead");
  }
}