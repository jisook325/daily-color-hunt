-- Color Hunt 테스트 데이터

-- 테스트 사용자의 완성된 콜라주 (테스트용)
INSERT OR IGNORE INTO collage_sessions (id, user_id, color, start_date, status, completed_at) VALUES 
  ('session-001', 'user-test-123', 'yellow', '2025-09-19', 'completed', '2025-09-19 14:30:00'),
  ('session-002', 'user-test-123', 'blue', '2025-09-18', 'completed', '2025-09-18 16:45:00'),
  ('session-003', 'user-test-456', 'red', '2025-09-20', 'in_progress', NULL);

-- 완성된 콜라주 데이터
INSERT OR IGNORE INTO completed_collages (id, session_id, user_id, color, date, collage_data) VALUES 
  ('collage-001', 'session-001', 'user-test-123', 'yellow', '2025-09-19', 'data:image/jpeg;base64,sample_collage_data_1'),
  ('collage-002', 'session-002', 'user-test-123', 'blue', '2025-09-18', 'data:image/jpeg;base64,sample_collage_data_2');

-- 진행 중인 세션의 사진들 (테스트용)
INSERT OR IGNORE INTO photos (id, session_id, position, image_data, thumbnail_data) VALUES 
  ('photo-001', 'session-003', 1, 'data:image/jpeg;base64,sample_photo_1', 'data:image/jpeg;base64,sample_thumb_1'),
  ('photo-002', 'session-003', 2, 'data:image/jpeg;base64,sample_photo_2', 'data:image/jpeg;base64,sample_thumb_2'),
  ('photo-003', 'session-003', 5, 'data:image/jpeg;base64,sample_photo_3', 'data:image/jpeg;base64,sample_thumb_3');