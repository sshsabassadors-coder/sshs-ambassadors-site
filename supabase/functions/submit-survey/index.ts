import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = allowedOrigins.length === 0 ? "*" : allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function response(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

type Question = {
  question_key: string;
  question_type: "short" | "long" | "single" | "multiple" | "scale" | "yesno";
  is_required: boolean;
  options: unknown[];
  condition_question_key: string | null;
  condition_equals: string | null;
};

function validateAnswer(question: Question, value: unknown): string | null {
  if (question.question_type === "scale") {
    return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5 ? null : "must be an integer from 1 to 5";
  }
  if (question.question_type === "short") {
    return typeof value === "string" && value.trim().length <= 300 ? null : "must be text up to 300 characters";
  }
  if (question.question_type === "long") {
    return typeof value === "string" && value.trim().length <= 2000 ? null : "must be text up to 2,000 characters";
  }
  if (question.question_type === "single") {
    return typeof value === "string" && question.options.includes(value) ? null : "must match one available option";
  }
  if (question.question_type === "multiple") {
    return Array.isArray(value) && value.length <= 12 && value.every((item) => typeof item === "string" && question.options.includes(item)) ? null : "must contain only available options";
  }
  if (question.question_type === "yesno") {
    return typeof value === "boolean" ? null : "must be true or false";
  }
  return "uses an unsupported type";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return response(request, 405, { error: "Method not allowed" });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_768) return response(request, 413, { error: "Payload is too large" });

  const raw = await request.text();
  if (raw.length > 32_768) return response(request, 413, { error: "Payload is too large" });

  let payload: { surveyId?: unknown; answers?: unknown };
  try { payload = JSON.parse(raw); } catch { return response(request, 400, { error: "Invalid JSON" }); }

  if (typeof payload.surveyId !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.surveyId)) return response(request, 400, { error: "Invalid survey id" });
  if (!payload.answers || typeof payload.answers !== "object" || Array.isArray(payload.answers)) return response(request, 400, { error: "Answers must be an object" });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return response(request, 500, { error: "Server configuration is incomplete" });
  const client = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: survey, error: surveyError } = await client
    .from("surveys")
    .select("id,status,opens_at,closes_at")
    .eq("id", payload.surveyId)
    .single();
  if (surveyError || !survey) return response(request, 404, { error: "Survey not found" });

  const now = Date.now();
  if (survey.status !== "published" || (survey.opens_at && Date.parse(survey.opens_at) > now) || (survey.closes_at && Date.parse(survey.closes_at) < now)) {
    return response(request, 409, { error: "Survey is not accepting responses" });
  }

  const { data: questions, error: questionError } = await client
    .from("survey_questions")
    .select("question_key,question_type,is_required,options,condition_question_key,condition_equals")
    .eq("survey_id", survey.id)
    .order("sort_order");
  if (questionError || !questions) return response(request, 500, { error: "Could not load questions" });

  const answers = payload.answers as Record<string, unknown>;
  const knownKeys = new Set(questions.map((question: Question) => question.question_key));
  if (Object.keys(answers).some((key) => !knownKeys.has(key))) return response(request, 400, { error: "An unknown question was submitted" });

  for (const question of questions as Question[]) {
    const visible = !question.condition_question_key || answers[question.condition_question_key] === question.condition_equals;
    if (!visible) continue;
    const value = answers[question.question_key];
    const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    if (empty && question.is_required) return response(request, 400, { error: `${question.question_key} is required` });
    if (empty) continue;
    const validationError = validateAnswer(question, value);
    if (validationError) return response(request, 400, { error: `${question.question_key} ${validationError}` });
  }

  const { data: responseId, error: insertError } = await client.rpc("store_survey_response", {
    p_survey_id: survey.id,
    p_answers: answers,
    p_user_agent_hint: request.headers.get("user-agent")?.slice(0, 120) ?? null,
  });
  if (insertError) return response(request, 500, { error: "Could not store response" });

  return response(request, 201, { ok: true, responseId });
});
