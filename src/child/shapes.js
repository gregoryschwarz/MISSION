export const SHAPES = {
  cercle: { sides: 0, svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#a2d2ff"/></svg>' },
  triangle: { sides: 3, svg: '<svg viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90" fill="#ffb4a2"/></svg>' },
  carre: { sides: 4, svg: '<svg viewBox="0 0 100 100"><rect x="15" y="15" width="70" height="70" fill="#a8e6cf"/></svg>' },
  rectangle: { sides: 4, svg: '<svg viewBox="0 0 100 100"><rect x="10" y="25" width="80" height="50" fill="#ffe5a0"/></svg>' },
  losange: { sides: 4, svg: '<svg viewBox="0 0 100 100"><polygon points="50,10 90,50 50,90 10,50" fill="#cdb4db"/></svg>' },
  pentagone: { sides: 5, svg: '<svg viewBox="0 0 100 100"><polygon points="50,10 90,40 75,90 25,90 10,40" fill="#ff9a8b"/></svg>' },
  hexagone: { sides: 6, svg: '<svg viewBox="0 0 100 100"><polygon points="30,10 70,10 90,50 70,90 30,90 10,50" fill="#84fab0"/></svg>' },
};

export function shapeSvg(shapeId) {
  return SHAPES[shapeId]?.svg ?? '';
}

export function shapeSides(shapeId) {
  return SHAPES[shapeId]?.sides ?? 0;
}
