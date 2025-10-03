import React, { useEffect, useRef, useState } from 'react';

// LearningModule: silently evolves an LLM prompt per-user based on past rejection/approval reasons.
// Props:
// - userId (string) - required
// - rejectionsApi (string) - default "/api/rejections"
// - updatePromptApi (string) - default "/api/updatePrompt"
// - basePrompt (string) - default "Review code carefully." 
// The component renders nothing visible; it runs background fetch/poll and posts evolved prompt when it changes.

const DEFAULT_REJECTIONS_API = '/api/rejections';
const DEFAULT_UPDATE_API = '/api/updatePrompt';
const DEFAULT_BASE_PROMPT = 'Review code carefully.';

const pickDirectivesFromReasons = (reasons = []) => {
  // Map common keywords to structured directives
  const directives = new Set();

  reasons.forEach((r) => {
    if (!r || typeof r !== 'string') return;
    const s = r.toLowerCase();
    if (s.includes('strength') || s.includes('strengths')) directives.add('Include a "Strengths" section.');
    if (s.includes('issue') || s.includes('bug') || s.includes('problem')) directives.add('Include an "Issues" section describing problems and root causes.');
    if (s.includes('suggest') || s.includes('improv') || s.includes('recommend')) directives.add('Include a "Suggestions" or "Recommendations" section with actionable fixes.');
    if (s.includes('concise') || s.includes('short') || s.includes('brief')) directives.add('Keep points concise (1-2 short sentences).');
    if (s.includes('bullet') || s.includes('bulleted')) directives.add('Use bullet points for lists.');
    if (s.includes('example') || s.includes('snippet')) directives.add('Provide minimal code snippets if relevant.');
    if (s.includes('performance')) directives.add('Mention performance considerations where applicable.');
    if (s.includes('security')) directives.add('Highlight security issues and provide 1-line recommendations.');
    if (s.includes('readability') || s.includes('maintain')) directives.add('Call out readability and maintainability improvements.');
    if (s.includes('rating') || s.includes('score')) directives.add('Provide a short overall rating (scale 1-10) with 1-line rationale.');
  });
w
  // Always prefer bullets and structure
  directives.add('Provide structured sections and use clear headings.');
  directives.add('Use consistent spacing and readable formatting.');

  return Array.from(directives);
};

const evolvePrompt = (basePrompt, reasons = []) => {
  const directives = pickDirectivesFromReasons(reasons);
  if (!directives || directives.length === 0) return basePrompt;

  const additions = directives.join(' ');
  // Keep the prompt concise but specific
  const evolved = `${basePrompt.trim()} ${additions}`.replace(/\s+/g, ' ').trim();
  return evolved;
};

const fetchRejectionsForUser = async (api, userId) => {
  try {
    const url = `${api}${api.includes('?') ? '&' : '?'}userId=${encodeURIComponent(userId)}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json();
    // Expecting array of reason strings or objects with reason field
    if (Array.isArray(data)) return data;
    if (data.reasons && Array.isArray(data.reasons)) return data.reasons;
    return null;
  } catch (e) {
    console.error('LearningModule: fetchRejectionsForUser error', e);
    return null;
  }
};

const postEvolvedPrompt = async (api, userId, prompt) => {
  try {
    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ userId, prompt }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => null);
      console.warn('LearningModule: updatePrompt POST failed', res.status, text);
      return false;
    }
    return true;
  } catch (e) {
    console.error('LearningModule: postEvolvedPrompt error', e);
    return false;
  }
};

const LearningModule = ({
  userId,
  rejectionsApi = DEFAULT_REJECTIONS_API,
  updatePromptApi = DEFAULT_UPDATE_API,
  basePrompt = DEFAULT_BASE_PROMPT,
  pollIntervalMs = 15000,
}) => {
  const [reasons, setReasons] = useState([]);
  const lastSentPromptRef = useRef(null);
  const mountedRef = useRef(false);

  // Fetch + evolve + send
  const runCycle = async () => {
    if (!userId) return;
    const fetched = await fetchRejectionsForUser(rejectionsApi, userId);
    if (!fetched) return;

    // Normalize to array of strings
    const normalized = fetched.map((r) => (typeof r === 'string' ? r : r.reason || r.text || ''))
      .filter(Boolean);

    // Compare shallow equality
    const same = normalized.length === reasons.length && normalized.every((v, i) => v === reasons[i]);
    if (same) return; // no change

    setReasons(normalized);

    const evolved = evolvePrompt(basePrompt, normalized);

    // Avoid sending duplicate prompt repeatedly
    if (lastSentPromptRef.current === evolved) return;

    const ok = await postEvolvedPrompt(updatePromptApi, userId, evolved);
    if (ok) {
      lastSentPromptRef.current = evolved;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    // initial run
    runCycle();
    // poll
    const id = setInterval(() => {
      if (!mountedRef.current) return;
      runCycle();
    }, pollIntervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, rejectionsApi, updatePromptApi, basePrompt]);

  // Also react to immediate changes in reasons (in case parent updates user-specific state)
  useEffect(() => {
    if (!userId) return;
    // If reasons change locally, run one immediate cycle to ensure prompt is updated.
    runCycle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Silent component, no UI
  return null;
};

export default LearningModule;
