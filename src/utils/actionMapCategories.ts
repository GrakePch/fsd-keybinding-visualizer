export const actionMapCategories = ["ship_general", "vehicle_mining_and_salvage", "turret", "player", "ground_vehicle", "social", "interaction", "camera", "spectator"];

export const actionMapCategoriesMap: Record<string, string[]> = {
  ship_general: [
    "seat_general",
    "spaceship_general",
    "vehicle_mfd",
    "spaceship_view",
    "spaceship_movement",
    "spaceship_quantum",
    "spaceship_docking",
    "spaceship_targeting",
    "spaceship_targeting_advanced",
    "spaceship_target_hailing",
    "spaceship_radar",
    "spaceship_scanning",
    "spaceship_weapons",
    "spaceship_missiles",
    "spaceship_defensive",
    "spaceship_power",
    "spaceship_hud",
    "lights_controller",
    "stopwatch",
  ],
  vehicle_mining_and_salvage: ["spaceship_mining", "spaceship_salvage"],
  turret: ["turret_movement", "turret_advanced"],
  player: ["player", "prone", "tractor_beam", "mining", "incapacitated", "zero_gravity_eva", "zero_gravity_traversal"],
  ground_vehicle: ["vehicle_general", "vehicle_driver"],
  _hidden: ["spaceship_auto_weapons", "vehicle_mobiglas", "mapui", "hacking", "debug", "IFCS_controls", "flycam", "character_customizer", "RemoteRigidEntityController", "server_renderer", "ui_textfield"],
  spectator: ["spectator"],
  social: ["default", "ui_notification", "player_emotes"],
  interaction: ["player_input_optical_tracking", "player_choice"],
  camera: ["view_director_mode"],
};

export const filterOurHidden = (groupNames: string[]) => {
  const setHidden = new Set(actionMapCategoriesMap._hidden);
  return groupNames.filter((groupName) => setHidden.has(groupName) === false);
};
