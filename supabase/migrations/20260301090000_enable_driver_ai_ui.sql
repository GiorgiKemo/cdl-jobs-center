-- Enable driver-facing AI matches UI rollout
UPDATE matching_rollout_config
SET driver_ui_enabled = TRUE,
    updated_at = now()
WHERE id = 1;