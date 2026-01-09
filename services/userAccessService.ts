// services/userAccessService.ts
import { supabase } from "./supabaseClient";

export type AccessStatus = "ACTIVE" | "PENDING" | "NOT_FOUND";

const TABLE = "user_access";
const USER_ID_COL = "user_id";
const STATUS_COL = "status";

export async function getAccessStatus(): Promise<AccessStatus> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const user = authData.user;
  if (!user) return "NOT_FOUND";

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq(USER_ID_COL, user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return "NOT_FOUND";

  const raw = String((data as any)[STATUS_COL] ?? "").trim().toLowerCase();

  if (raw === "active") return "ACTIVE";
  if (raw === "pending") return "PENDING";

  return "PENDING";
}
