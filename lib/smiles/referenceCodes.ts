export type SmilesReferencePrefix = "BK" | "RV" | "OF" | "EV";

export function makeSmilesReference(prefix: SmilesReferencePrefix) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const randomPart = Array.from({ length: 6 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");

  return `SM-${prefix}-${randomPart}`;
}

export async function makeUniqueSmilesReference({
  supabase,
  table,
  column = "reference_code",
  prefix,
}: {
  supabase: any;
  table: string;
  column?: string;
  prefix: SmilesReferencePrefix;
}) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const reference = makeSmilesReference(prefix);

    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq(column, reference)
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