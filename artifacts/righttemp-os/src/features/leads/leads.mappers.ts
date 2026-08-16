import type { Lead, LeadInput, LeadInsert, LeadRow } from "./leads.types";

export function mapLeadRowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    customerId: row.customer_id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    status: row.status,
    source:
      row.source === "social"
        ? "social_media"
        : row.source === "google" || row.source === "yelp"
          ? "website"
          : (row.source ?? "other"),
    serviceType: row.service_type,
    zip: row.zip,
    urgency: row.urgency,
    notes: row.notes,
    attributionSource: row.attribution_source,
    attributionCampaign: row.attribution_campaign,
    landingPage: row.landing_page,
    createdAt: row.created_at,

    estimatePrice: row.estimate_price,
    equipment: row.equipment,
    scopeOfWork: row.scope_of_work,
    contactedNotes: row.contacted_notes,
    qualifiedNotes: row.qualified_notes,
  };
}

export function mapLeadInputToInsert(
  input: LeadInput,
  organizationId: string,
): LeadInsert {
  return {
    organization_id: organizationId,
    name: input.name,
    email: input.email || null,
    phone: input.phone || null,
    status: input.status,
    source:
      input.source === "walk_in"
        ? "other"
        : input.source === "social_media"
          ? "social"
          : input.source,
    service_type: input.serviceType ?? null,

    estimate_price: input.estimatePrice ?? null,
    equipment: input.equipment ?? null,
    scope_of_work: input.scopeOfWork ?? null,
    contacted_notes: input.contactedNotes ?? null,
    qualified_notes: input.qualifiedNotes ?? null,
  };
}
