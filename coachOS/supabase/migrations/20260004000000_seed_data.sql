-- Migration 004: Development seed data
-- Run this ONLY in local/development environments.
-- Never run against production.
--
-- Usage: supabase db seed  (or paste into Supabase Studio SQL editor locally)
--
-- Requires: Pete's coach account must already exist in auth.users.
-- Set COACH_USER_ID in your .env.local, then substitute below.
-- The placeholder '00000000-0000-0000-0000-000000000001' should be replaced
-- with the real UUID after first login.

do $$
declare
  coach uuid := '00000000-0000-0000-0000-000000000001'; -- replace with real UUID
  client_sarah uuid := gen_random_uuid();
  client_tom   uuid := gen_random_uuid();
  client_emma  uuid := gen_random_uuid();
  plan_sarah   uuid := gen_random_uuid();
  plan_tom     uuid := gen_random_uuid();
begin

-- ─── Sample clients ───────────────────────────────────────────────────────────

insert into clients (id, coach_id, full_name, email, phone, client_type, goals,
  health_notes, status, billing_model, billing_status, checkin_cadence,
  next_checkin_date, onboarded_at)
values
  (
    client_sarah, coach,
    'Sarah Mitchell', 'sarah@example.com', '+61 400 111 222',
    'triathlon', array['70.3 race prep', 'improve run off bike'],
    'Left knee tendinopathy — avoid heavy leg press. Cleared for all other training.',
    'active', 'subscription', 'active', 'weekly',
    current_date + 3,
    now() - interval '6 weeks'
  ),
  (
    client_tom, coach,
    'Tom Nguyen', 'tom@example.com', '+61 400 333 444',
    'general', array['build muscle', 'lose 8kg', 'improve energy'],
    null,
    'active', 'retainer', 'active', 'weekly',
    current_date + 5,
    now() - interval '3 weeks'
  ),
  (
    client_emma, coach,
    'Emma Clarke', 'emma@example.com', '+61 400 555 666',
    'general', array['post-partum fitness', 'rebuild core strength'],
    'Post-partum (8 months). No high-impact until physio clears. Core rehab phase.',
    'trial', 'trial', 'active', 'fortnightly',
    current_date + 10,
    now() - interval '1 week'
  );


-- ─── Sample templates ─────────────────────────────────────────────────────────

insert into templates (coach_id, name, session_type, equipment, duration_minutes, exercises, tags)
values
  (
    coach,
    'Triathlon Strength Phase 1 — Lower',
    'strength', 'gym', 60,
    '[
      {"name":"Goblet Squat","sets":3,"reps":"12","duration_seconds":null,"rest_seconds":60,"notes":"Focus on depth, keep chest up","video_url":null},
      {"name":"Romanian Deadlift","sets":3,"reps":"10","duration_seconds":null,"rest_seconds":90,"notes":"Hinge pattern, soft knee","video_url":null},
      {"name":"Single-Leg Press","sets":3,"reps":"10","duration_seconds":null,"rest_seconds":60,"notes":"Addresses left-right imbalance","video_url":null},
      {"name":"Hip Thrust","sets":3,"reps":"12","duration_seconds":null,"rest_seconds":60,"notes":"Full hip extension at top","video_url":null},
      {"name":"Calf Raise","sets":3,"reps":"15","duration_seconds":null,"rest_seconds":45,"notes":"Single leg if comfortable","video_url":null}
    ]'::jsonb,
    array['triathlon','lower body','phase 1']
  ),
  (
    coach,
    'Triathlon Strength Phase 1 — Upper',
    'strength', 'gym', 50,
    '[
      {"name":"Lat Pulldown","sets":3,"reps":"10","duration_seconds":null,"rest_seconds":60,"notes":"Full range, control the descent","video_url":null},
      {"name":"Dumbbell Row","sets":3,"reps":"10","duration_seconds":null,"rest_seconds":60,"notes":"Elbows close to body","video_url":null},
      {"name":"Push-Up","sets":3,"reps":"to failure","duration_seconds":null,"rest_seconds":60,"notes":"Strict form","video_url":null},
      {"name":"Face Pull","sets":3,"reps":"15","duration_seconds":null,"rest_seconds":45,"notes":"External rotation focus","video_url":null},
      {"name":"Dead Bug","sets":3,"reps":"8 each side","duration_seconds":null,"rest_seconds":45,"notes":"Core stability","video_url":null}
    ]'::jsonb,
    array['triathlon','upper body','phase 1']
  ),
  (
    coach,
    'General Strength — Full Body A',
    'strength', 'gym', 55,
    '[
      {"name":"Back Squat","sets":4,"reps":"8","duration_seconds":null,"rest_seconds":120,"notes":"Compound priority","video_url":null},
      {"name":"Bench Press","sets":4,"reps":"8","duration_seconds":null,"rest_seconds":120,"notes":"","video_url":null},
      {"name":"Barbell Row","sets":3,"reps":"10","duration_seconds":null,"rest_seconds":90,"notes":"","video_url":null},
      {"name":"Overhead Press","sets":3,"reps":"10","duration_seconds":null,"rest_seconds":90,"notes":"","video_url":null},
      {"name":"Plank","sets":3,"reps":"45 seconds","duration_seconds":45,"rest_seconds":30,"notes":"","video_url":null}
    ]'::jsonb,
    array['general','full body','strength']
  ),
  (
    coach,
    'Home — Minimal Equipment Circuit',
    'conditioning', 'home', 35,
    '[
      {"name":"Jump Squat","sets":3,"reps":"12","duration_seconds":null,"rest_seconds":30,"notes":"Land soft","video_url":null},
      {"name":"Push-Up","sets":3,"reps":"15","duration_seconds":null,"rest_seconds":30,"notes":"","video_url":null},
      {"name":"Reverse Lunge","sets":3,"reps":"10 each","duration_seconds":null,"rest_seconds":30,"notes":"","video_url":null},
      {"name":"Mountain Climber","sets":3,"reps":"20 each","duration_seconds":null,"rest_seconds":30,"notes":"","video_url":null},
      {"name":"Glute Bridge","sets":3,"reps":"15","duration_seconds":null,"rest_seconds":30,"notes":"","video_url":null}
    ]'::jsonb,
    array['home','minimal equipment','conditioning']
  );


-- ─── Sample weekly plan + sessions for Sarah ─────────────────────────────────
-- Current week (Monday = this week's Monday)

insert into weekly_plans (id, coach_id, client_id, week_start, week_end, status, coach_notes, published_at)
values (
  plan_sarah, coach, client_sarah,
  date_trunc('week', current_date)::date,
  (date_trunc('week', current_date) + interval '6 days')::date,
  'published',
  'Race in 8 weeks. Moderate build week. Keep strength sessions short — heavy bike on Wednesday.',
  now()
);

insert into sessions (coach_id, client_id, weekly_plan_id, name, session_date, session_type, source, duration_minutes, intensity, notes)
values
  (coach, client_sarah, plan_sarah, 'Easy Aerobic Run', date_trunc('week', current_date)::date, 'run', 'trainingpeaks', 45, 'easy', 'Zone 2. Keep HR under 145. Focus on cadence.'),
  (coach, client_sarah, plan_sarah, 'Triathlon Strength — Lower', date_trunc('week', current_date)::date + 1, 'strength', 'coachOS', 60, 'moderate', 'Modified — no single-leg press this week (knee check-in)'),
  (coach, client_sarah, plan_sarah, 'Threshold Bike', date_trunc('week', current_date)::date + 2, 'bike', 'trainingpeaks', 90, 'hard', '2x20 min @ FTP. Warm up 15 min, cool down 15 min.'),
  (coach, client_sarah, plan_sarah, 'Recovery Swim', date_trunc('week', current_date)::date + 3, 'swim', 'trainingpeaks', 40, 'easy', 'Aerobic. Focus on catch and pull. No hard sets.'),
  (coach, client_sarah, plan_sarah, 'Triathlon Strength — Upper', date_trunc('week', current_date)::date + 4, 'strength', 'coachOS', 50, 'moderate', null),
  (coach, client_sarah, plan_sarah, 'Long Run', date_trunc('week', current_date)::date + 5, 'run', 'trainingpeaks', 75, 'moderate', 'Aerobic long run. Build to 90 min next week.'),
  (coach, client_sarah, plan_sarah, 'Rest / Optional Mobility', date_trunc('week', current_date)::date + 6, 'rest', 'coachOS', 20, 'easy', '10 min hip flexor work + foam roll if time allows.');


-- ─── Sample weekly plan for Tom ───────────────────────────────────────────────

insert into weekly_plans (id, coach_id, client_id, week_start, week_end, status, coach_notes, published_at)
values (
  plan_tom, coach, client_tom,
  date_trunc('week', current_date)::date,
  (date_trunc('week', current_date) + interval '6 days')::date,
  'published',
  'Week 3 of hypertrophy block. Aim to add 2.5kg on all main lifts this week.',
  now()
);

insert into sessions (coach_id, client_id, weekly_plan_id, name, session_date, session_type, source, duration_minutes, intensity, notes)
values
  (coach, client_tom, plan_tom, 'Full Body A', date_trunc('week', current_date)::date, 'strength', 'coachOS', 60, 'moderate', null),
  (coach, client_tom, plan_tom, '30 min Incline Walk', date_trunc('week', current_date)::date + 1, 'conditioning', 'coachOS', 30, 'easy', 'Fasted is fine if that fits your schedule.'),
  (coach, client_tom, plan_tom, 'Full Body B', date_trunc('week', current_date)::date + 2, 'strength', 'coachOS', 60, 'moderate', null),
  (coach, client_tom, plan_tom, 'Rest', date_trunc('week', current_date)::date + 3, 'rest', 'coachOS', null, null, null),
  (coach, client_tom, plan_tom, 'Full Body A', date_trunc('week', current_date)::date + 4, 'strength', 'coachOS', 60, 'hard', 'Push the weights today — aim for 2.5kg PB on squat and bench.'),
  (coach, client_tom, plan_tom, '30 min Cardio (choice)', date_trunc('week', current_date)::date + 5, 'conditioning', 'coachOS', 30, 'easy', null),
  (coach, client_tom, plan_tom, 'Rest', date_trunc('week', current_date)::date + 6, 'rest', 'coachOS', null, null, null);


-- ─── Sample check-in ──────────────────────────────────────────────────────────

insert into checkins (client_id, coach_id, submitted_at, energy, sleep, stress, nutrition, notes, photo_urls)
values (
  client_sarah, coach,
  now() - interval '2 days',
  4, 3, 3, 4,
  'Feeling good overall. Knee is fine — no pain during runs. Sleep was rough mid-week (work stress). Really enjoyed the long bike on Wednesday.',
  '{}'
);

insert into checkins (client_id, coach_id, submitted_at, energy, sleep, stress, nutrition, notes, photo_urls)
values (
  client_tom, coach,
  now() - interval '1 day',
  3, 4, 2, 3,
  'Hit all my sessions. Squats felt heavy on Friday — not sure if I slept badly or just a bad day. Weight is down 1.2kg this week.',
  '{}'
);


-- ─── Sample client notes ──────────────────────────────────────────────────────

insert into client_notes (coach_id, client_id, note, note_type)
values
  (coach, client_sarah, 'Onboarding call done. Very motivated. Knee is a watch point — physio cleared for all training except heavy leg press. Has a 70.3 in 8 weeks (Darwin). Competitive age grouper, trains 10-12 hrs/week currently.', 'call'),
  (coach, client_sarah, 'Check-in week 5: knee holding up well. Suggested she book a follow-up with physio before race week.', 'general'),
  (coach, client_tom, 'Onboarding call done. Works long hours (IT). Prefers morning sessions. Main goal is body recomp — specifically wants to drop 8kg and build visible upper body muscle. No injuries.', 'call'),
  (coach, client_emma, 'Intro call. Post-partum 8 months. Has been cleared by OB for exercise but not by physio for high-impact yet. Very cautious personality — needs lots of reassurance. Starting with 3x/week, low intensity.', 'call');


end $$;
