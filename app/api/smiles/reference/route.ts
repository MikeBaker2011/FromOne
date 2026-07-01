import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const smilesSupabaseUrl = process.env.STOCKPORT_SMILES_SUPABASE_URL || "";
const smilesServiceRoleKey =
  process.env.STOCKPORT_SMILES_SUPABASE_SERVICE_ROLE_KEY || "";

type SmilesReferencePrefix = "BK" | "RV" | "OF" | "EV";
type SmilesReferenceType = "booking" | "review" | "offer" | "event";

type SmilesReferenceConfig = {
  table: string;
  prefix: SmilesReferencePrefix;
};

const TABLES: Record<SmilesReferenceType, SmilesReferenceConfig> = {
  booking: {
    table: "bookings",
    prefix: "BK",
  },
  review: {
    table: "client_reviews",
    prefix: "RV",
  },
  offer: {
    table: "offers",
    prefix: "OF",
  },
  event: {
    table: "events",
    prefix: "EV",
  },
};

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function cleanReferenceType(value: unknown): SmilesReferenceType | "" {
  const cleaned = cleanText(value).toLowerCase();

  if (
    cleaned === "booking" ||
    cleaned === "review" ||
    cleaned === "offer" ||
    cleaned === "event"
  ) {
    return cleaned;
  }

  return "";
}

function getSmilesSupabaseAdmin() {
  if (!smilesSupabaseUrl || !smilesServiceRoleKey) {
    throw new Error("Missing Stockport Smiles Supabase environment variables.");
  }

  return createClient(smilesSupabaseUrl, smilesServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function makeSmilesReference(prefix: SmilesReferencePrefix) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const randomPart = Array.from({ length: 6 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");

  return `SM-${prefix}-${randomPart}`;
}

async function makeUniqueSmilesReference({
  smiles,
  table,
  prefix,
}: {
  smiles: ReturnType<typeof getSmilesSupabaseAdmin>;
  table: string;
  prefix: SmilesReferencePrefix;
}) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const reference = makeSmilesReference(prefix);

    const { data, error } = await smiles
      .from(table)
      .select("id")
      .eq("reference_code", reference)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return reference;
    }
  }

  throw new Error("Could not generate a unique Smiles reference. Please try again.");
}

async function ensureReference({
  smiles,
  itemType,
  itemId,
}: {
  smiles: ReturnType<typeof getSmilesSupabaseAdmin>;
  itemType: SmilesReferenceType;
  itemId: string;
}) {
  const config = TABLES[itemType];
  const selectColumns =
    itemType === "offer" || itemType === "event"
      ? "id, reference_code, slug"
      : "id, reference_code";

  const existingResult = await smiles
    .from(config.table)
    .select(selectColumns)
    .eq("id", itemId)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(existingResult.error.message);
  }

  const existing = existingResult.data as any;

  if (!existing?.id) {
    throw new Error("Smiles item was not found.");
  }

  const currentReference = cleanText(existing.reference_code);

  if (currentReference) {
    return {
      id: existing.id,
      reference_code: currentReference,
      slug: cleanText(existing.slug),
      changed: false,
    };
  }

  const referenceCode = await makeUniqueSmilesReference({
    smiles,
    table: config.table,
    prefix: config.prefix,
  });

  const updateResult = await smiles
    .from(config.table)
    .update({
      reference_code: referenceCode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select("id, reference_code")
    .single();

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  const updated = updateResult.data as any;

  if (!updated?.id) {
    throw new Error("Reference code was not saved.");
  }

  return {
    id: updated.id,
    reference_code: updated.reference_code,
    slug: cleanText(existing.slug),
    changed: true,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const itemType = cleanReferenceType(
      (body as any).itemType || (body as any).item_type
    );

    const itemId = cleanText((body as any).itemId || (body as any).item_id);

    if (!itemType) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "Missing or invalid Smiles item type.",
        },
        { status: 400 }
      );
    }

    if (!itemId) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "Missing Smiles item id.",
        },
        { status: 400 }
      );
    }

    const smiles = getSmilesSupabaseAdmin();

    const reference = await ensureReference({
      smiles,
      itemType,
      itemId,
    });

    return NextResponse.json({
      ok: true,
      success: true,
      message: reference.changed
        ? "Reference code created."
        : "Reference code already exists.",
      itemType,
      itemId,
      reference_code: reference.reference_code,
      smilesSlug: reference.slug || null,
      slug: reference.slug || null,
      changed: reference.changed,
    });
  } catch (error: any) {
    const message = error?.message || "Could not create Smiles reference code.";

    console.error("Smiles reference API error:", message);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        message,
        error: message,
      },
      { status: 500 }
    );
  }
}
