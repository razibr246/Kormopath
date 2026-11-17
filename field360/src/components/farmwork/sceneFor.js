// Which farm-work scene each crop's bar opens: a Rabi crop shows its harvest, the next crop its sowing. Kept apart from
// scenes.jsx so the season ribbon can know which scene to show without loading every scene's artwork up front.
export const RABI_SCENE = { tomato: 'tomato', wheat: 'wheat', mustard: 'mustard', lentil: 'lentil' };
export const NEXT_SCENE = { mungbean: 'mungbean', sesame: 'sesame' };
// The ribbon always shows its three animations (Rabi, Kharif-1, Kharif-2), whatever crop or place is chosen. A crop
// without a scene of its own plays the closest work (Boro is cut low with a sickle like wheat; jute and Aus are
// broadcast like sesame) and the card says so; it never passes it off as that crop's own scene.
export const RABI_STAND_IN = 'wheat';
export const NEXT_STAND_IN = 'sesame';
export const sceneForRabi = (cropId) => RABI_SCENE[cropId] || RABI_STAND_IN;
export const sceneForNext = (cropId) => NEXT_SCENE[cropId] || NEXT_STAND_IN;
