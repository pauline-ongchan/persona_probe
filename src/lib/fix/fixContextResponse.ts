import { FIX_ATTEMPT_CALLBACK_STATUSES, type FixContext, type FixContextResponse } from "./types";

export function buildFixContextResponse({
  appUrl,
  fixAttemptId,
  fixContext,
  requestUrl,
  token
}: {
  appUrl?: string;
  fixAttemptId: string;
  fixContext: FixContext;
  requestUrl: string;
  token: string;
}): FixContextResponse {
  const publicAppUrl = appUrl?.replace(/\/$/, "") || new URL(requestUrl).origin;

  return {
    ...fixContext,
    callback: {
      url: `${publicAppUrl}/api/fix-attempts/${fixAttemptId}/callback`,
      method: "POST",
      authHeader: "Authorization",
      bearerToken: token,
      statusValues: [...FIX_ATTEMPT_CALLBACK_STATUSES]
    }
  };
}
