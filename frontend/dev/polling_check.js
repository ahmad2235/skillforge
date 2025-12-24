// Simple dev check for submission polling semantic derivation
function deriveSemantic(payload) {
  const evaluation = payload?.ai_evaluation ?? null;
  const submissionStatus = payload?.status ?? null;

  const semanticFromTop = payload?.evaluation_status ?? null;
  const semanticFromAi = evaluation?.semantic_status ?? null;
  let semanticDerived = null;
  if (evaluation?.status === 'succeeded') semanticDerived = 'completed';
  else if (evaluation?.status === 'failed') semanticDerived = 'failed';

  const semantic = semanticFromTop ?? semanticFromAi ?? semanticDerived ?? (submissionStatus === 'needs_manual_review' ? 'manual_review' : null);
  return semantic;
}

// Test
const payload = {
  evaluation_status: 'failed',
  ai_evaluation: { status: 'failed', semantic_status: null, meta: { reason: 'healthcheck_failed' } },
  status: 'submitted'
};

console.log('Derived semantic:', deriveSemantic(payload));
console.log('Expected: failed');
