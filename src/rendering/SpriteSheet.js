// Procedural sprite rendering helpers
// All sprites are drawn procedurally — no external assets

export const COSTUMES = {
  beach: { color1: '#ff6644', color2: '#ffcc00', accent: '#ffffff', desc: 'Hawaiian shirt + board shorts' },
  warehouse: { color1: '#4466aa', color2: '#ddbb88', accent: '#ffdd00', desc: 'Coveralls + hard hat' },
  suburban: { color1: '#8866aa', color2: '#ddbb88', accent: '#ffffff', desc: 'Bathrobe + slippers' },
  pacman: { color1: '#ffdd00', color2: '#ffdd00', accent: '#000000', desc: 'Yellow jumpsuit' },
  city: { color1: '#222244', color2: '#ddbb88', accent: '#cc0000', desc: 'Business suit' },
  backyard: { color1: '#ffffff', color2: '#ddbb88', accent: '#ff4444', desc: "Chef's apron + spatula" },
  parkour: { color1: '#556644', color2: '#ddbb88', accent: '#887766', desc: 'Tank top + cargo pants' },
  rooftop: { color1: '#111111', color2: '#333333', accent: '#cc0000', desc: 'Ninja outfit' },
  war: { color1: '#556644', color2: '#ddbb88', accent: '#445533', desc: 'Military fatigues' },
  horror: { color1: '#cc2244', color2: '#eebb88', accent: '#880022', desc: 'Blood-stained prom dress' },
  gasstation: { color1: '#3355aa', color2: '#ddbb88', accent: '#cccccc', desc: "Mechanic's jumpsuit" },
  wafflehouse: { color1: '#ddaa00', color2: '#ddbb88', accent: '#553300', desc: 'Waffle House uniform' },
  protest: { color1: '#44aa44', color2: '#ddbb88', accent: '#ffffff', desc: 'Activist outfit' },
  greenscreen: { color1: '#888888', color2: '#ddbb88', accent: '#44ff44', desc: 'Motion capture suit' },
  bridge: { color1: '#ff6600', color2: '#ddbb88', accent: '#ffcc00', desc: 'Stunt jumpsuit' },
  airplane: { color1: '#223388', color2: '#ddbb88', accent: '#cc0000', desc: 'Flight attendant uniform' },
};

export function getCostumeForTheme(themeId) {
  return COSTUMES[themeId] || COSTUMES.beach;
}
