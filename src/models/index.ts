export * from './editRequest.model'
export * from './isActive.model'
export * from './login.model'
export * from './request.model'
export * from './response.model'
export * from './timeZone.model'

export const searchableAttributes = [
  'email',
  'firstName',
  'lastName',
  'notes',
  'userName',
  'gender'
];

export const searchableIds = ['id', 'vehicleId'];

export const sortableAttributes = [
  'id',
  'email',
  'firstName',
  'lastName',
  'notes',
  'userName',
  'gender',
  'isActive'
];
