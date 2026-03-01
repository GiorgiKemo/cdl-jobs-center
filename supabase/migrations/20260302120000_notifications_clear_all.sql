-- Clear all notifications for current user
CREATE OR REPLACE FUNCTION clear_all_notifications()
RETURNS VOID AS $$
BEGIN
  DELETE FROM notifications
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
