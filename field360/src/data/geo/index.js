// Boundary and places for each upazila the app covers (built by scripts/build/build_godagari_*.py <upazila>).
// Savar, Keraniganj, Dohar and Nawabganj are here for Ropan Radar, which shows every Dhaka district upazila in depth.
import godagariBoundary from './godagari_boundary.json';
import godagariPlaces from './godagari_places.json';
import dhamraiBoundary from './dhamrai_boundary.json';
import dhamraiPlaces from './dhamrai_places.json';
import savarBoundary from './savar_boundary.json';
import savarPlaces from './savar_places.json';
import keraniganjBoundary from './keraniganj_boundary.json';
import keraniganjPlaces from './keraniganj_places.json';
import doharBoundary from './dohar_boundary.json';
import doharPlaces from './dohar_places.json';
import nawabganjBoundary from './nawabganj_boundary.json';
import nawabganjPlaces from './nawabganj_places.json';
// The five division story upazilas.
import sitakundaBoundary from './sitakunda_boundary.json';
import sitakundaPlaces from './sitakunda_places.json';
import dacopeBoundary from './dacope_boundary.json';
import dacopePlaces from './dacope_places.json';
import bakerganjBoundary from './bakerganj_boundary.json';
import bakerganjPlaces from './bakerganj_places.json';
import gangacharaBoundary from './gangachara_boundary.json';
import gangacharaPlaces from './gangachara_places.json';
import gowainghatBoundary from './gowainghat_boundary.json';
import gowainghatPlaces from './gowainghat_places.json';

// Ropon Radar's other upazilas (every rural upazila of the seven districts) have light maps in ./radar/, built by
// scripts/build/build_radar_geo.py and fetched only when the radar page opens one (loadGeo adds it to GEO).
const RADAR_GEO = {
  './radar/agailjhara.json': () => import('./radar/agailjhara.json').then((m) => m.default),
  './radar/anowara.json': () => import('./radar/anowara.json').then((m) => m.default),
  './radar/babuganj.json': () => import('./radar/babuganj.json').then((m) => m.default),
  './radar/badarganj.json': () => import('./radar/badarganj.json').then((m) => m.default),
  './radar/bagha.json': () => import('./radar/bagha.json').then((m) => m.default),
  './radar/baghmara.json': () => import('./radar/baghmara.json').then((m) => m.default),
  './radar/balaganj.json': () => import('./radar/balaganj.json').then((m) => m.default),
  './radar/banaripara.json': () => import('./radar/banaripara.json').then((m) => m.default),
  './radar/banshkhali.json': () => import('./radar/banshkhali.json').then((m) => m.default),
  './radar/barishalsadar.json': () => import('./radar/barishalsadar.json').then((m) => m.default),
  './radar/batiaghata.json': () => import('./radar/batiaghata.json').then((m) => m.default),
  './radar/beanibazar.json': () => import('./radar/beanibazar.json').then((m) => m.default),
  './radar/bishwanath.json': () => import('./radar/bishwanath.json').then((m) => m.default),
  './radar/boalkhali.json': () => import('./radar/boalkhali.json').then((m) => m.default),
  './radar/chandanaish.json': () => import('./radar/chandanaish.json').then((m) => m.default),
  './radar/charghat.json': () => import('./radar/charghat.json').then((m) => m.default),
  './radar/companiganj.json': () => import('./radar/companiganj.json').then((m) => m.default),
  './radar/dakshinsurma.json': () => import('./radar/dakshinsurma.json').then((m) => m.default),
  './radar/dighalia.json': () => import('./radar/dighalia.json').then((m) => m.default),
  './radar/dumuria.json': () => import('./radar/dumuria.json').then((m) => m.default),
  './radar/durgapur.json': () => import('./radar/durgapur.json').then((m) => m.default),
  './radar/fatikchhari.json': () => import('./radar/fatikchhari.json').then((m) => m.default),
  './radar/fenchuganj.json': () => import('./radar/fenchuganj.json').then((m) => m.default),
  './radar/gaurnadi.json': () => import('./radar/gaurnadi.json').then((m) => m.default),
  './radar/golabganj.json': () => import('./radar/golabganj.json').then((m) => m.default),
  './radar/hathazari.json': () => import('./radar/hathazari.json').then((m) => m.default),
  './radar/hizla.json': () => import('./radar/hizla.json').then((m) => m.default),
  './radar/jaintiapur.json': () => import('./radar/jaintiapur.json').then((m) => m.default),
  './radar/kanaighat.json': () => import('./radar/kanaighat.json').then((m) => m.default),
  './radar/kaunia.json': () => import('./radar/kaunia.json').then((m) => m.default),
  './radar/koyra.json': () => import('./radar/koyra.json').then((m) => m.default),
  './radar/lohagara.json': () => import('./radar/lohagara.json').then((m) => m.default),
  './radar/mehendiganj.json': () => import('./radar/mehendiganj.json').then((m) => m.default),
  './radar/mirsharai.json': () => import('./radar/mirsharai.json').then((m) => m.default),
  './radar/mithapukur.json': () => import('./radar/mithapukur.json').then((m) => m.default),
  './radar/mohanpur.json': () => import('./radar/mohanpur.json').then((m) => m.default),
  './radar/muladi.json': () => import('./radar/muladi.json').then((m) => m.default),
  './radar/paba.json': () => import('./radar/paba.json').then((m) => m.default),
  './radar/paikgachha.json': () => import('./radar/paikgachha.json').then((m) => m.default),
  './radar/patiya.json': () => import('./radar/patiya.json').then((m) => m.default),
  './radar/phultala.json': () => import('./radar/phultala.json').then((m) => m.default),
  './radar/pirgachha.json': () => import('./radar/pirgachha.json').then((m) => m.default),
  './radar/pirganj.json': () => import('./radar/pirganj.json').then((m) => m.default),
  './radar/puthia.json': () => import('./radar/puthia.json').then((m) => m.default),
  './radar/rangpursadar.json': () => import('./radar/rangpursadar.json').then((m) => m.default),
  './radar/rangunia.json': () => import('./radar/rangunia.json').then((m) => m.default),
  './radar/raozan.json': () => import('./radar/raozan.json').then((m) => m.default),
  './radar/rupsa.json': () => import('./radar/rupsa.json').then((m) => m.default),
  './radar/sandwip.json': () => import('./radar/sandwip.json').then((m) => m.default),
  './radar/satkania.json': () => import('./radar/satkania.json').then((m) => m.default),
  './radar/sylhetsadar.json': () => import('./radar/sylhetsadar.json').then((m) => m.default),
  './radar/tanore.json': () => import('./radar/tanore.json').then((m) => m.default),
  './radar/taraganj.json': () => import('./radar/taraganj.json').then((m) => m.default),
  './radar/terokhada.json': () => import('./radar/terokhada.json').then((m) => m.default),
  './radar/wazirpur.json': () => import('./radar/wazirpur.json').then((m) => m.default),
  './radar/zakiganj.json': () => import('./radar/zakiganj.json').then((m) => m.default),
};
const RADAR_GEO_IDS = new Set(Object.keys(RADAR_GEO).map((k) => k.slice('./radar/'.length, -'.json'.length)));
export const hasGeo = (id) => !!GEO[id] || RADAR_GEO_IDS.has(id);
export function loadGeo(id) {
  if (GEO[id]) return Promise.resolve(GEO[id]);
  const f = RADAR_GEO[`./radar/${id}.json`];
  return f ? f().then((j) => (GEO[id] = { boundary: j.boundary, places: j.places, lite: true })) : Promise.reject(new Error(`no map for ${id}`));
}

export const GEO = {
  godagari: { boundary: godagariBoundary, places: godagariPlaces },
  dhamrai: { boundary: dhamraiBoundary, places: dhamraiPlaces },
  savar: { boundary: savarBoundary, places: savarPlaces },
  keraniganj: { boundary: keraniganjBoundary, places: keraniganjPlaces },
  dohar: { boundary: doharBoundary, places: doharPlaces },
  nawabganj: { boundary: nawabganjBoundary, places: nawabganjPlaces },
  sitakunda: { boundary: sitakundaBoundary, places: sitakundaPlaces },
  dacope: { boundary: dacopeBoundary, places: dacopePlaces },
  bakerganj: { boundary: bakerganjBoundary, places: bakerganjPlaces },
  gangachara: { boundary: gangacharaBoundary, places: gangacharaPlaces },
  gowainghat: { boundary: gowainghatBoundary, places: gowainghatPlaces },
};
