function buildUserContext(user) {
    const { username = 'student', tier = 'developing', level = 'beginner', track = 'software engineering', mode = 'normal', stats = {}, currentPhase } = user;
    const { mastery = 0, streak = 0, testsCount = 0, avgTestScore = 0, completedTasks = 0 } = stats;
    const lines = [
      'User: ' + username,
      'Tier: ' + tier + ' | Level: ' + level + ' | Track: ' + track,
      'Mode: ' + mode,
      mastery > 0 || testsCount > 0
        ? 'Performance: ' + mastery + '% mastery | ' + streak + 'd streak | ' + testsCount + ' tests (avg ' + avgTestScore + '%) | ' + completedTasks + ' tasks'
        : 'Performance: Beginner — no activity yet',
    ];
    if (currentPhase) lines.push('Current phase: Week ' + currentPhase.week + ' — ' + currentPhase.phase);
    return lines.join('\n');
  }
  
  function buildToneInstructions(mode) {
    if (mode === 'harsh') return 'TONE: Brutally honest. No sugarcoating. Short punchy sentences. Praise only when truly earned.';
    if (mode === 'competitive') return 'TONE: Competitive and motivating. Frame everything as a challenge. High energy.';
    return 'TONE: Supportive but honest. Acknowledge effort, identify gaps, give actionable steps.';
  }
  
  function getIdentity(feature, mode) {
    const harsh = mode === 'harsh';
    if (feature === 'mentor')    return harsh ? 'You are SIGMA — a brutally honest AI mentor who refuses to coddle students.' : 'You are SIGMA — an expert AI mentor for software development and competitive programming.';
    if (feature === 'harsh')     return 'You are SIGMA Performance Analyzer — ruthless, data-driven, prevents mediocrity.';
    if (feature === 'codeReview')return 'You are an expert code reviewer with 15+ years experience. Be specific, cite line numbers.';
    if (feature === 'roadmap')   return 'You are an expert curriculum designer. Create logical, progressive learning phases.';
    if (feature === 'performance')return 'You are a data-driven performance analyst. Identify trends, give specific targets.';
    return 'You are SIGMA — an expert AI learning assistant.';
  }
  
  function buildSystemPrompt(feature, user, extra = '') {
    return [getIdentity(feature, user.mode), '', buildUserContext(user), '', buildToneInstructions(user.mode), ...(extra ? ['', extra] : [])].join('\n');
  }
  
  function buildCodeContext(code, language, context = '') {
    return [language ? 'Language: ' + language : '', context ? 'Context: ' + context : '', '', '```', code, '```'].filter(Boolean).join('\n');
  }
  
  function buildPerfContext(stats) {
    const { mastery = 0, streak = 0, testsCount = 0, avgTestScore = 0, completedTasks = 0, totalTasks = 0, passRate = 0 } = stats;
    return [
      'PERFORMANCE DATA:',
      '  Mastery:      ' + mastery + '%',
      '  Streak:       ' + streak + ' days',
      '  Tests:        ' + testsCount + ' (avg ' + avgTestScore + '%, pass rate ' + passRate + '%)',
      '  Tasks:        ' + completedTasks + '/' + totalTasks,
    ].join('\n');
  }
  
  module.exports = { buildUserContext, buildToneInstructions, buildSystemPrompt, buildCodeContext, buildPerfContext };