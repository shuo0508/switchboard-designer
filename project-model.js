// Manufacturer-independent project/domain helpers.
// This module must not import the manufacturer rule engine or any UX module.

export const BUS_RATINGS = ['6300 A', '5000 A', '3200 A'];
export const SWITCHBOARD_IDS = ['SWB-01', 'SWB-02'];
export const DIMENSION_STATUS = { USER_DEFINED: 'USER_DEFINED', NOT_DEFINED: 'NOT_DEFINED' };

export function ratingAmps(rating) {
  return Number.parseInt(String(rating || '').replace(/[^0-9]/g, ''), 10) || 0;
}

export function switchboardIds(project) {
  return project.quantity === 2 ? ['SWB-01', 'SWB-02'] : ['SWB-01'];
}

// Pure read: never mutates the project.
export function ratedMainBus(project, boardId) {
  return project.switchboards?.[boardId]?.ratedMainBus || project.mainBus || BUS_RATINGS[0];
}

export function ratingMode(project, boardId) {
  return project.switchboards?.[boardId]?.ratingMode === 'override' ? 'override' : 'inherited';
}

export function breakerDisplayLabel(breaker) {
  return `${breaker.switchboardId || 'SWB-01'} / ${breaker.id}`;
}

function dimensionValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

// Switchboard height/depth are project inputs. A value is USER_DEFINED only when the user entered it.
export function getSwitchboardDimensions(project) {
  const heightMm = dimensionValue(project.dimensions?.heightMm);
  const depthMm = dimensionValue(project.dimensions?.depthMm);
  const status = value => value === null ? DIMENSION_STATUS.NOT_DEFINED : DIMENSION_STATUS.USER_DEFINED;
  return {
    heightMm,
    depthMm,
    heightStatus: status(heightMm),
    depthStatus: status(depthMm),
    label: (heightMm === null ? 'H Not Defined' : 'H ' + heightMm + ' mm · USER_DEFINED') + ' / ' + (depthMm === null ? 'D Not Defined' : 'D ' + depthMm + ' mm · USER_DEFINED'),
    matchedManufacturerDimension: null,
    note: 'User-entered project dimensions. Not matched to a manufacturer configuration rule.',
  };
}

export function normalizeDimensionInput(value) {
  return dimensionValue(value);
}
