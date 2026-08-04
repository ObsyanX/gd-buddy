INSERT INTO public.article_categories (id, name, slug, description)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'GD Strategy', 'gd-strategy', 'Proven strategies for cracking group discussions and personal interviews'),
  ('22222222-2222-2222-2222-222222222222', 'Communication Skills', 'communication-skills', 'Articles on speaking, listening, body language and persuasion'),
  ('33333333-3333-3333-3333-333333333333', 'Career Prep', 'career-prep', 'Placement preparation, resume tips and interview readiness')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.article_tags (id, name, slug)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'Group Discussion', 'group-discussion'),
  ('55555555-5555-5555-5555-555555555555', 'Communication', 'communication'),
  ('66666666-6666-6666-6666-666666666666', 'Interview Tips', 'interview-tips'),
  ('77777777-7777-7777-7777-777777777777', 'AI Simulator', 'ai-simulator'),
  ('88888888-8888-8888-8888-888888888888', 'Body Language', 'body-language')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.articles (
  id, title, slug, summary, status, category_id,
  body_markdown, body_html, seo_title, seo_description, seo_keywords,
  reading_time_min, related_ids, editor_mode, created_at, updated_at, publish_at
)
VALUES
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'How to Start a Group Discussion Confidently',
  'how-to-start-group-discussion',
  'Learn the opening-statement frameworks that help you lead a GD without sounding rehearsed or dominating.',
  'published',
  '11111111-1111-1111-1111-111111111111',
  E'# How to Start a Group Discussion Confidently\n\nA strong opening in a group discussion (GD) sets the tone, establishes your presence, and signals leadership without aggression. Recruiters watch the first 60 seconds closely because that is when candidates reveal preparation, clarity, and confidence.\n\n## Why the opening matters\n\nWhen you open a GD well, you create a framework for the rest of the group. You are not just speaking first; you are helping the panel understand the topic and giving the group a direction. This increases the chance that the evaluator notes your name.\n\n## Three safe opening frameworks\n\n1. **Define the topic in context.** Briefly explain what the topic means today. For example, "Artificial Intelligence in hiring" is not just about algorithms; it is about fairness, scale, and human oversight.\n2. **Present a fact or statistic.** A credible number makes your opening memorable. Keep it concise and relevant.\n3. **Pose a rhetorical question.** Questions engage listeners and invite the group to respond, making the conversation collaborative.\n\n## What to avoid\n\n- Long monologues. Keep the opening under 90 seconds.\n- Aggressive language. "I am right and you are wrong" style openings reduce your score.\n- Starting with "I think" repeatedly. It weakens the statement.\n\n## Practice on GD Buddy\n\nUse the AI simulator to rehearse opening statements and get instant feedback on pace, clarity, and body language. Repetition builds the muscle memory you need under pressure.',
  '<h1>How to Start a Group Discussion Confidently</h1><p>A strong opening in a group discussion (GD) sets the tone, establishes your presence, and signals leadership without aggression.</p><h2>Why the opening matters</h2><p>When you open a GD well, you create a framework for the rest of the group.</p><h2>Three safe opening frameworks</h2><ol><li>Define the topic in context.</li><li>Present a fact or statistic.</li><li>Pose a rhetorical question.</li></ol><h2>What to avoid</h2><ul><li>Long monologues.</li><li>Aggressive language.</li><li>Starting with "I think" repeatedly.</li></ul><h2>Practice on GD Buddy</h2><p>Use the AI simulator to rehearse opening statements and get instant feedback.</p>',
  'How to Start a Group Discussion Confidently | GD Buddy',
  'Master the opening statement for group discussions with frameworks that show confidence, clarity, and leadership.',
  'group discussion, opening statement, GD tips, placement preparation',
  5,
  ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[],
  'markdown',
  now(),
  now(),
  now()
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'How to Conclude a Group Discussion Effectively',
  'how-to-conclude-group-discussion',
  'A clear conclusion can rescue a wandering GD. Learn how to summarise without repeating every point.',
  'published',
  '11111111-1111-1111-1111-111111111111',
  E'# How to Conclude a Group Discussion Effectively\n\nThe conclusion is your last chance to impress the evaluator. Many candidates fade at this stage because they run out of ideas or simply repeat what others said. A strong conclusion is brief, balanced, and forward-looking.\n\n## What evaluators want in a conclusion\n\n- A crisp summary of the key arguments discussed.\n- A balanced view rather than a one-sided verdict.\n- A practical recommendation or a way forward.\n\n## The conclusion formula\n\n1. **Signal closure.** Say, "In conclusion" or "To sum up the discussion."\n2. **Summarise two or three main points.** Do not list every opinion.\n3. **Add a closing insight.** Mention a stakeholder, a trend, or a caution.\n\n## Mistakes that lower your score\n\n- Introducing new data at the last minute.\n- Being overly emotional or biased.\n- Letting someone else snatch the conclusion after you set it up.\n\n## Practice tips\n\nRecord yourself summarising random GD topics and listen for filler words. On GD Buddy, the AI scores coherence and closure, so you can track progress.',
  '<h1>How to Conclude a Group Discussion Effectively</h1><p>The conclusion is your last chance to impress the evaluator.</p><h2>What evaluators want in a conclusion</h2><ul><li>A crisp summary of the key arguments discussed.</li><li>A balanced view rather than a one-sided verdict.</li><li>A practical recommendation or a way forward.</li></ul><h2>The conclusion formula</h2><ol><li>Signal closure.</li><li>Summarise two or three main points.</li><li>Add a closing insight.</li></ol><h2>Mistakes that lower your score</h2><ul><li>Introducing new data at the last minute.</li><li>Being overly emotional or biased.</li><li>Letting someone else snatch the conclusion.</li></ul><h2>Practice tips</h2><p>Record yourself summarising random GD topics and listen for filler words.</p>',
  'How to Conclude a Group Discussion Effectively | GD Buddy',
  'Learn the conclusion formula for group discussions: summarise key points, stay balanced, and end with a forward-looking insight.',
  'group discussion conclusion, GD summary, placement tips, conclusion formula',
  5,
  ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[],
  'markdown',
  now(),
  now(),
  now()
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Common Group Discussion Mistakes and How to Avoid Them',
  'common-gd-mistakes',
  'Avoid the most common GD pitfalls, from interrupting too often to speaking without data.',
  'published',
  '33333333-3333-3333-3333-333333333333',
  E'# Common Group Discussion Mistakes and How to Avoid Them\n\nEven well-prepared candidates lose marks in group discussions because of small behavioural mistakes. Knowing what not to do is as important as knowing what to say.\n\n## 1. Interrupting too often\n\nInterrupting is the fastest way to be marked as aggressive. Wait for a pause, then enter with a bridge phrase like, "I would like to add to that point."\n\n## 2. Speaking without structure\n\nRandom thoughts make you sound confused. Use the PREP method: Point, Reason, Example, Point.\n\n## 3. Dominating the conversation\n\nQuality beats quantity. Three strong contributions are better than ten weak ones.\n\n## 4. Ignoring the group\n\nGD is a team exercise. Acknowledge others, build on their points, and bring shy participants in when possible.\n\n## 5. Relying only on opinion\n\nBack your views with facts, examples, or recent news. Evaluators value evidence-based thinking.\n\n## How GD Buddy helps\n\nThe AI simulator replays your session and flags interruptions, filler words, and low-impact statements so you can fix them before the real placement season.',
  '<h1>Common Group Discussion Mistakes and How to Avoid Them</h1><p>Even well-prepared candidates lose marks in group discussions because of small behavioural mistakes.</p><h2>1. Interrupting too often</h2><p>Interrupting is the fastest way to be marked as aggressive.</p><h2>2. Speaking without structure</h2><p>Use the PREP method: Point, Reason, Example, Point.</p><h2>3. Dominating the conversation</h2><p>Quality beats quantity.</p><h2>4. Ignoring the group</h2><p>GD is a team exercise.</p><h2>5. Relying only on opinion</h2><p>Back your views with facts.</p><h2>How GD Buddy helps</h2><p>The AI simulator replays your session and flags interruptions, filler words, and low-impact statements.</p>',
  'Common Group Discussion Mistakes | GD Buddy',
  'Avoid common GD pitfalls like interrupting, dominating, and unsupported opinions. Practice with AI feedback on GD Buddy.',
  'group discussion mistakes, GD errors, placement preparation, AI feedback',
  6,
  ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[],
  'markdown',
  now(),
  now(),
  now()
),
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'Body Language Tips for Group Discussions',
  'body-language-tips-for-gd',
  'Your posture, eye contact, and hand gestures speak louder than words in a GD. Learn how to project confidence.',
  'published',
  '22222222-2222-2222-2222-222222222222',
  E'# Body Language Tips for Group Discussions\n\nBody language is a silent scoring parameter in most group discussions. Evaluators notice posture, eye contact, hand movement, and facial expressions while you speak. Positive body language makes you appear confident and approachable.\n\n## Posture\n\nSit upright with relaxed shoulders. Leaning back looks disinterested, while leaning too far forward can seem aggressive.\n\n## Eye contact\n\nAvoid staring at the evaluator. Address the group. Make brief eye contact with the person who just spoke before adding your view.\n\n## Hand gestures\n\nUse open palm gestures when making a point. Avoid pointing or crossing arms.\n\n## Facial expressions\n\nA calm, attentive expression signals engagement. Frowning or smirking while others speak can hurt your impression.\n\n## Record and review\n\nGD Buddy''s video analysis scores posture and eye contact over time, giving you a clear improvement plan.',
  '<h1>Body Language Tips for Group Discussions</h1><p>Body language is a silent scoring parameter in most group discussions.</p><h2>Posture</h2><p>Sit upright with relaxed shoulders.</p><h2>Eye contact</h2><p>Avoid staring at the evaluator. Address the group.</p><h2>Hand gestures</h2><p>Use open palm gestures when making a point.</p><h2>Facial expressions</h2><p>A calm, attentive expression signals engagement.</p><h2>Record and review</h2><p>GD Buddy''s video analysis scores posture and eye contact.</p>',
  'Body Language Tips for Group Discussions | GD Buddy',
  'Improve your GD body language: posture, eye contact, gestures, and facial expressions. Get AI video feedback on GD Buddy.',
  'body language, group discussion, posture, eye contact, placement tips',
  4,
  ARRAY['cccccccc-cccc-cccc-cccc-cccccccccccc']::uuid[],
  'markdown',
  now(),
  now(),
  now()
),
(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'How to Practice Group Discussions with AI',
  'how-to-practice-gd-with-ai',
  'Use AI simulations to rehearse group discussions at any time, with instant feedback and no scheduling hassle.',
  'published',
  '33333333-3333-3333-3333-333333333333',
  E'# How to Practice Group Discussions with AI\n\nGroup discussion practice traditionally requires a group of peers, a topic, and a free hour. With AI, you can rehearse anytime, get structured feedback, and repeat as many times as you need.\n\n## Why AI practice works\n\n- **Consistency.** You can practise daily without waiting for others.\n- **Honest feedback.** The AI does not worry about hurting your feelings. It scores clarity, structure, and time usage directly.\n- **Diverse topics.** From economy to ethics, AI can generate fresh topics and counter-arguments.\n\n## What to look for in an AI GD simulator\n\n1. Real-time transcription and speech analysis.\n2. Multiple AI personas with different personalities.\n3. A scoring rubric aligned with campus placement criteria.\n4. Replay and report features.\n\n## Getting the most from each session\n\nPick one skill to focus on per session: opening, data usage, listening, or conclusion. Review the report, then repeat. Small, focused improvements compound quickly.\n\n## GD Buddy''s AI simulator\n\nGD Buddy lets you create a session, choose AI personas, and receive a detailed report covering communication, body language, content, and teamwork. It is designed for placement candidates who want measurable progress.',
  '<h1>How to Practice Group Discussions with AI</h1><p>Group discussion practice traditionally requires a group of peers, a topic, and a free hour.</p><h2>Why AI practice works</h2><ul><li>Consistency.</li><li>Honest feedback.</li><li>Diverse topics.</li></ul><h2>What to look for in an AI GD simulator</h2><ol><li>Real-time transcription and speech analysis.</li><li>Multiple AI personas.</li><li>A scoring rubric aligned with campus placement criteria.</li><li>Replay and report features.</li></ol><h2>Getting the most from each session</h2><p>Pick one skill to focus on per session.</p><h2>GD Buddy''s AI simulator</h2><p>GD Buddy lets you create a session, choose AI personas, and receive a detailed report.</p>',
  'How to Practice Group Discussions with AI | GD Buddy',
  'Practise group discussions with AI on GD Buddy: get consistent feedback, diverse topics, and placement-aligned scoring.',
  'AI group discussion, GD simulator, AI practice, placement preparation',
  6,
  ARRAY['77777777-7777-7777-7777-777777777777']::uuid[],
  'markdown',
  now(),
  now(),
  now()
),
(
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'A Complete Guide to Group Discussion Preparation',
  'complete-guide-to-gd-preparation',
  'Build a structured GD preparation plan: reading, analysis, practice, and feedback.',
  'published',
  '33333333-3333-3333-3333-333333333333',
  E'# A Complete Guide to Group Discussion Preparation\n\nGroup discussion preparation is not about memorising answers. It is about building a system that helps you think, speak, and listen under pressure. Here is a practical four-week plan.\n\n## Week 1: Build awareness\n\nRead newspapers, follow economic and social trends, and note down one talking point per day. Focus on understanding the "why" behind events, not just the facts.\n\n## Week 2: Structure your thoughts\n\nPractise the PREP method and the STAR method. Record yourself speaking for 60 seconds on random topics. Listen back and remove filler words.\n\n## Week 3: Practise with others\n\nJoin peer groups or use GD Buddy''s AI simulator. Aim for at least three sessions per week. Track which skills are improving.\n\n## Week 4: Simulate under pressure\n\nCreate a mock placement day. Dress formally, join a timed session, and review the recording. The closer your practice is to the real event, the calmer you will feel.\n\n## Final advice\n\nPreparation reduces anxiety more than talent. A prepared candidate who listens well will usually outscore a spontaneous but unstructured speaker.',
  '<h1>A Complete Guide to Group Discussion Preparation</h1><p>Group discussion preparation is not about memorising answers.</p><h2>Week 1: Build awareness</h2><p>Read newspapers and follow trends.</p><h2>Week 2: Structure your thoughts</h2><p>Practise the PREP method and the STAR method.</p><h2>Week 3: Practise with others</h2><p>Join peer groups or use GD Buddy''s AI simulator.</p><h2>Week 4: Simulate under pressure</h2><p>Create a mock placement day.</p><h2>Final advice</h2><p>Preparation reduces anxiety more than talent.</p>',
  'Complete Guide to Group Discussion Preparation | GD Buddy',
  'A four-week group discussion preparation plan: awareness, structure, practice, and simulation.',
  'GD preparation, group discussion plan, placement preparation, communication practice',
  7,
  ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[],
  'markdown',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.article_tag_map (article_id, tag_id)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '88888888-8888-8888-8888-888888888888'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '77777777-7777-7777-7777-777777777777'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '44444444-4444-4444-4444-444444444444'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '44444444-4444-4444-4444-444444444444')
ON CONFLICT (article_id, tag_id) DO NOTHING;
