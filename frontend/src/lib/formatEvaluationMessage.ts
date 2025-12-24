export type FormatResult = { title?: string; message: string };

export function formatEvaluationMessage(semanticStatus: string | null, aiEvaluation: any, evaluationDebug: any): FormatResult {
  const meta = aiEvaluation?.meta ?? {};
  const debugMsg = evaluationDebug?.message ?? null;
  const reason = meta?.reason ?? null;

  if (!semanticStatus || semanticStatus === 'pending') {
    return { message: 'Evaluation in progress' };
  }

  if (semanticStatus === 'completed') {
    return { message: 'Evaluation complete' };
  }

  if (semanticStatus === 'manual_review') {
    if (reason === 'ai_disabled') {
      return { message: 'AI evaluation is disabled. Your submission will be reviewed manually.' };
    }
    return { message: reason ?? debugMsg ?? 'Needs manual review' };
  }

  if (semanticStatus === 'skipped') {
    return { message: reason ?? debugMsg ?? 'Auto evaluation skipped' };
  }

  if (semanticStatus === 'failed') {
    // Do not show timeout here; timeout is special and uses stopReason 'timeout'
    return { message: reason ?? debugMsg ?? 'Unknown' };
  }

  return { message: 'Evaluation status unknown' };
}

// Dev helper: simple check (no test framework required)
export function devCheck(): boolean {
  const payload = { evaluation_status: 'manual_review', ai_evaluation: { meta: { reason: 'ai_disabled' } } };
  const res = formatEvaluationMessage(payload.evaluation_status, payload.ai_evaluation, null);
  // must mention 'AI evaluation is disabled'
  // return true if check passes
  return (res.message || '').toLowerCase().includes('ai evaluation is disabled');
}
