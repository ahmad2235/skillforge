import { formatEvaluationMessage } from '../../lib/formatEvaluationMessage';

export function checkManualReviewAiDisabled(): boolean {
  const payload = { evaluation_status: 'manual_review', ai_evaluation: { meta: { reason: 'ai_disabled' } } } as any;
  const res = formatEvaluationMessage(payload.evaluation_status, payload.ai_evaluation, null);
  // return true if message mentions AI evaluation disabled
  return (res.message || '').toLowerCase().includes('ai evaluation is disabled');
}

// You can run this in console during dev to validate the helper:
// import { checkManualReviewAiDisabled } from './hooks/__dev__/formatEvaluationMessageCheck';
// console.log(checkManualReviewAiDisabled());
